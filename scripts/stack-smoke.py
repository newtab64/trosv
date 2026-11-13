#!/usr/bin/env python3
"""Smoke test of the whole docker compose stack (nginx -> FrankenPHP/Laravel -> Postgres, Reverb).

Runs against an already started stack (see .github/workflows/_stack.yml) and needs only the
Python standard library. Exit code 0 = every check passed.

    python3 scripts/stack-smoke.py

Env (defaults match docker-compose.yml with default ports):
    STACK_WEB_URL     http://localhost:5174   nginx, the URL browsers use (proxies /api, /storage)
    STACK_API_URL     http://localhost:8000   backend directly (server-level behaviour)
    STACK_REVERB      localhost:8080          Reverb host:port
    REVERB_APP_KEY    app key of Reverb (same value as in the stack's .env)

Why these checks exist: each one pins a bug that was real and invisible to unit tests and to
the e2e job (which does not run the compose stack): nginx rejecting uploads over 1 MB, an
upload that failed inside PHP returning 500, root-owned storage swallowing uploads, a server
revealing itself, and realtime chat silently not delivering (the app swallows broadcast errors).
"""

from __future__ import annotations

import base64
import concurrent.futures as cf
import hashlib
import json
import os
import socket
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib
from typing import Any

WEB = os.environ.get("STACK_WEB_URL", "http://localhost:5174").rstrip("/")
API = os.environ.get("STACK_API_URL", "http://localhost:8000").rstrip("/")
REVERB = os.environ.get("STACK_REVERB", "localhost:8080")
REVERB_KEY = os.environ.get("REVERB_APP_KEY", "ci-key")

MB = 1024 * 1024
results: list[bool] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append(ok)
    print(("PASS  " if ok else "FAIL  ") + name + (f"   [{detail}]" if detail else ""), flush=True)
    return ok


# ------------------------------------------------------------------ http helpers
def request(method: str, url: str, headers: dict[str, str] | None = None, body: bytes | None = None):
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as err:
        return err.code, dict(err.headers), err.read()


def api(method: str, path: str, token: str | None = None, payload: Any = None, base: str = WEB):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode()
    status, resp_headers, raw = request(method, base + path, headers, body)
    try:
        return status, resp_headers, json.loads(raw)
    except ValueError:
        return status, resp_headers, raw


def multipart(fields: dict[str, str], files: list[tuple[str, str, str, bytes]], token: str):
    boundary = uuid.uuid4().hex
    out = b""
    for key, value in fields.items():
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
    for key, filename, ctype, data in files:
        out += (
            f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'
            f"Content-Type: {ctype}\r\n\r\n"
        ).encode() + data + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }
    return headers, out


def tiny_png() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = struct.pack(">I", len(data)) + kind + data
        return body + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    size = 64
    raw = b"".join(b"\x00" + bytes((x * 4) % 256 for x in range(size * 3)) for _ in range(size))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def login(email: str) -> str | None:
    status, _, data = api("POST", "/api/login", payload={"email": email, "password": "password"})
    return data["data"]["token"] if status == 200 else None


# ------------------------------------------------------------------ minimal websocket client
class WebSocket:
    """Just enough RFC 6455 to subscribe to a Pusher-protocol channel on Reverb."""

    def __init__(self, host: str, path: str) -> None:
        name, _, port = host.partition(":")
        self.sock = socket.create_connection((name, int(port or 80)), timeout=15)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(
            (
                f"GET {path} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
            ).encode()
        )
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("closed during handshake")
            head += chunk
        header_blob, _, self.buffer = head.partition(b"\r\n\r\n")
        if b" 101 " not in header_blob.split(b"\r\n")[0]:
            raise ConnectionError(header_blob.split(b"\r\n")[0].decode(errors="replace"))
        accept = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()  # noqa: S324
        ).decode()
        if accept.encode() not in header_blob:
            raise ConnectionError("bad Sec-WebSocket-Accept")

    def _read(self, count: int) -> bytes:
        while len(self.buffer) < count:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("socket closed")
            self.buffer += chunk
        data, self.buffer = self.buffer[:count], self.buffer[count:]
        return data

    def recv(self) -> str | None:
        """Next text frame (None for control frames)."""
        first, second = self._read(2)
        opcode = first & 0x0F
        length = second & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._read(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._read(8))[0]
        payload = self._read(length)
        if opcode == 0x9:  # ping -> pong
            self.send(payload, opcode=0xA)
            return None
        if opcode == 0x8:
            raise ConnectionError("server closed the socket")
        return payload.decode() if opcode == 0x1 else None

    def send(self, data: bytes | str, opcode: int = 0x1) -> None:
        payload = data.encode() if isinstance(data, str) else data
        mask = os.urandom(4)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        header = bytes([0x80 | opcode])
        if len(payload) < 126:
            header += bytes([0x80 | len(payload)])
        elif len(payload) < 65536:
            header += bytes([0x80 | 126]) + struct.pack(">H", len(payload))
        else:
            header += bytes([0x80 | 127]) + struct.pack(">Q", len(payload))
        self.sock.sendall(header + mask + masked)

    def close(self) -> None:
        self.sock.close()


def next_event(ws: WebSocket, wanted: str, timeout: float = 15.0) -> dict[str, Any] | None:
    deadline = time.time() + timeout
    ws.sock.settimeout(2)
    while time.time() < deadline:
        try:
            raw = ws.recv()
        except TimeoutError:
            continue
        if raw is None:
            continue
        message = json.loads(raw)
        if message.get("event") == wanted:
            return message
    return None


# ------------------------------------------------------------------ checks
def check_basics() -> None:
    status, _, _ = api("GET", "/api/health", base=API)
    check("backend health (direct)", status == 200, str(status))
    status, _, data = api("GET", "/api/listings")
    check("listings through nginx", status == 200 and bool(data["data"]), f"{len(data['data'])} listings")
    _, headers, _ = request("GET", API + "/api/listings", {"Accept": "application/json", "Accept-Encoding": "gzip"})
    check("responses are compressed", headers.get("Content-Encoding") in ("gzip", "zstd"), headers.get("Content-Encoding", "none"))
    check("X-Powered-By not sent", "X-Powered-By" not in headers)
    check("Server header does not name the software", "frankenphp" not in headers.get("Server", "").lower() and "caddy" not in headers.get("Server", "").lower(), headers.get("Server", "(none)"))
    status, _, data = api("GET", "/api/no-such-route")
    check("unknown API route is a JSON 404", status == 404 and isinstance(data, dict), str(status))
    status, _, data = api("GET", "/api/me")
    check("protected route without token is a JSON 401", status == 401 and isinstance(data, dict), str(status))


def check_listing_images(token: str, listing_id: int) -> None:
    status, _, full = api("GET", f"/api/listings/{listing_id}", token)
    for image in full["data"].get("images", []):  # keep the 5-image cap free across reruns
        if "seed-" not in image["url"]:
            api("DELETE", f"/api/listings/{listing_id}/images/{image['id']}", token)

    headers, body = multipart({}, [("images[]", "a.png", "image/png", tiny_png())], token)
    status, _, raw = request("POST", f"{WEB}/api/listings/{listing_id}/images", headers, body)
    if not check("listing photo upload stores the file", status == 200, str(status) if status == 200 else f"{status} {raw[:200]!r}"):
        return
    image = json.loads(raw)["data"][-1]
    path = "/" + image["url"].split("/", 3)[3]
    for label, base in (("nginx", WEB), ("backend", API)):
        status, headers, content = request("GET", base + path)
        check(f"uploaded photo is served from /storage ({label})", status == 200 and content[:4] == b"\x89PNG", f"{status} {headers.get('Content-Type')}")
    status, _, _ = request("GET", API + "/storage/../.env")
    check("path traversal out of /storage is refused", status in (400, 403, 404), str(status))
    status, _, _ = api("DELETE", f"/api/listings/{listing_id}/images/{image['id']}", token)
    check("uploaded photo can be deleted", status in (200, 204), str(status))

    big = tiny_png() + b"\0" * (7 * MB)
    headers, body = multipart({}, [("images[]", "big.png", "image/png", big)], token)
    status, _, _ = request("POST", f"{WEB}/api/listings/{listing_id}/images", headers, body)
    check("7 MB photo is a 422, not a 500", status == 422, str(status))


def check_attachments(student: str, conversation_id: int) -> None:
    pdf = b"%PDF-1.4\n" + b"0" * (3 * MB)
    headers, body = multipart({"body": "file"}, [("file", "big.pdf", "application/pdf", pdf)], student)
    status, _, raw = request("POST", f"{WEB}/api/conversations/{conversation_id}/messages", headers, body)
    # 3 MB is over nginx's 1 MB and PHP's 2 MB defaults: this is the regression test for both.
    if check("3 MB chat attachment goes through nginx", status == 201, str(status) if status == 201 else f"{status} {raw[:200]!r}"):
        attachment = json.loads(raw)["data"]["attachment_url"]
        path = attachment if attachment.startswith("/") else "/" + attachment.split("/", 3)[3]
        status, _, content = request("GET", WEB + path)
        check("signed attachment URL downloads the file", status == 200 and len(content) == len(pdf), f"{status} {len(content)} bytes")
        status, _, _ = request("GET", WEB + path[:-3] + "xxx")
        check("tampered signature is refused", status == 403, str(status))

    over = b"%PDF-1.4\n" + b"0" * (6 * MB)
    headers, body = multipart({"body": "file"}, [("file", "over.pdf", "application/pdf", over)], student)
    status, _, _ = request("POST", f"{WEB}/api/conversations/{conversation_id}/messages", headers, body)
    check("6 MB attachment is a 422, not a 500", status == 422, str(status))

    # Over the 26 MiB body limit (5 photos x 5 MiB must fit; see nginx, Caddy and php.ini).
    huge = b"x" * (28 * MB)
    headers, body = multipart({"body": "file"}, [("file", "huge.pdf", "application/pdf", huge)], student)
    try:
        status = request("POST", f"{API}/api/conversations/{conversation_id}/messages", headers, body)[0]
    except OSError as err:  # the server may close the connection while we are still sending
        status = f"connection closed ({type(err).__name__})"
    check("28 MB body is refused by the server", status in (400, 413) or str(status).startswith("connection closed"), str(status))


def check_realtime(student: str, conversation_id: int) -> None:
    """A message sent through the API must arrive on the Reverb private channel."""
    try:
        ws = WebSocket(REVERB, f"/app/{REVERB_KEY}?protocol=7&client=smoke&version=1.0")
    except (OSError, ConnectionError) as err:
        check("Reverb accepts a WebSocket connection", False, str(err))
        return
    try:
        established = next_event(ws, "pusher:connection_established", 10)
        if not check("Reverb accepts a WebSocket connection", established is not None):
            return
        socket_id = json.loads(established["data"])["socket_id"]
        channel = f"private-conversation.{conversation_id}"
        form = urllib.parse.urlencode({"socket_id": socket_id, "channel_name": channel}).encode()
        status, _, raw = request(
            "POST",
            f"{API}/broadcasting/auth",
            {"Authorization": f"Bearer {student}", "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            form,
        )
        if not check("channel authorization for a participant", status == 200, str(status)):
            return
        ws.send(json.dumps({"event": "pusher:subscribe", "data": {"channel": channel, "auth": json.loads(raw)["auth"]}}))
        subscribed = next_event(ws, "pusher_internal:subscription_succeeded", 10)
        if not check("subscribed to the private channel", subscribed is not None):
            return
        marker = f"smoke-{uuid.uuid4().hex[:8]}"
        status, _, _ = api("POST", f"/api/conversations/{conversation_id}/messages", student, {"body": marker})
        check("text message is stored", status == 201, str(status))
        event = next_event(ws, "message.sent", 15)
        delivered = event is not None and marker in event.get("data", "")
        check("message.sent is delivered to the subscriber in real time", delivered, "received" if delivered else "nothing within 15 s")
    finally:
        ws.close()


def check_concurrency() -> None:
    def hit(_: int) -> int:
        return request("GET", API + "/api/listings", {"Accept": "application/json"})[0]

    started = time.time()
    with cf.ThreadPoolExecutor(max_workers=32) as pool:
        statuses = list(pool.map(hit, range(300)))
    ok = sum(1 for s in statuses if s == 200)
    check("300 requests at 32 concurrency all succeed", ok == 300, f"{ok}/300 in {time.time() - started:.1f}s")


def main() -> int:
    check_basics()
    landlord = login("landlord1@example.com")
    student = login("student1@example.com")
    if not check("demo logins work (database was seeded)", bool(landlord and student)):
        return 1
    status, _, data = api("GET", "/api/my/listings", landlord)
    listing_id = data["data"][0]["id"]
    check_listing_images(landlord, listing_id)
    status, _, data = api("POST", "/api/conversations", student, {"listing_id": listing_id})
    if not check("student can start a conversation", status in (200, 201), str(status)):
        return 1
    conversation_id = data["data"]["id"]
    check_attachments(student, conversation_id)
    check_realtime(student, conversation_id)
    check_concurrency()
    print(f"\n{sum(results)}/{len(results)} checks passed")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
