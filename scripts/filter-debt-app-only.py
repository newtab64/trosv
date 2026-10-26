#!/usr/bin/env python3
"""
Filter debt_scanner output -> "app-only" register numbers.

Bước giữa của pipeline docs/reports/TECH-DEBT.md (scan -> filter -> prioritize ->
dashboard). Trước 2026-09-28 bước này là ad-hoc nên con số không tái tạo
được; script này chốt quy tắc lọc:

1. Path scope: chỉ giữ file thuộc mã ứng dụng thật - `apps/api/`, `apps/web/`,
   `apps/ai-service/`. Loại tài liệu (docs/, *.md ở gốc), hạ tầng (compose,
   infra/), công cụ cá nhân (.agents, .browser-check, ...).
2. Noise regex: loại todo_comment khớp `BUG`/`APP_DEBUG` (comment rule của
   Laravel/PROMPTS bị regex bắt nhầm - không phải debt thật).

Usage:
  python3 scripts/filter-debt-app-only.py debt_<ngay>.json \
    --output debt_<ngay>.app-only.json
"""
import argparse
import json
import re

APP_PREFIXES = ("apps/api/", "apps/web/", "apps/ai-service/")
# Test code bị loại khỏi scope: feature test in thẳng URL /api/... (đúng
# phong cách test - assert endpoint thật) nên hardcoded_paths của test là
# noise, không phải debt. Dồn số vào app code để trend so sánh được.
EXCLUDE_PREFIXES = (
    "apps/api/tests/",
    "apps/web/e2e/",
    "apps/web/.browser-check/",
    "apps/api/bootstrap/cache/",
)
NOISE_TODO = re.compile(r"(?i)(^|\W)(BUG|APP_DEBUG)(\W|$)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", help="JSON output of debt_scanner.py")
    ap.add_argument("--output", required=True, help="filtered JSON path")
    args = ap.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    items = data.get("debt_items", [])
    kept = []
    dropped_scope = dropped_noise = 0
    for it in items:
        path = it.get("file_path", "")
        if not path.startswith(APP_PREFIXES) or path.startswith(EXCLUDE_PREFIXES):
            dropped_scope += 1
            continue
        if it.get("type") == "todo_comment" and NOISE_TODO.search(it.get("description", "")):
            dropped_noise += 1
            continue
        kept.append(it)

    data["debt_items"] = kept
    # Đồng bộ summary để prioritizer/dashboard đọc đúng số đã lọc.
    summary = data.get("summary", {})
    if summary:
        summary["total_debt_items"] = len(kept)
        type_breakdown: dict = {}
        priority_breakdown: dict = {}
        files: set = set()
        for it in kept:
            type_breakdown[it.get("type", "?")] = type_breakdown.get(it.get("type", "?"), 0) + 1
            priority_breakdown[it.get("severity", "?")] = priority_breakdown.get(it.get("severity", "?"), 0) + 1
            files.add(it.get("file_path"))
        summary["type_breakdown"] = type_breakdown
        summary["priority_breakdown"] = priority_breakdown
        summary["total_files_scanned"] = len(files)
        if summary.get("total_lines_scanned"):
            lines = summary.get("total_lines_scanned_app_only")
        # density theo file đã lọc (file/app-only có trong metadata riêng).
        if files and data.get("file_statistics"):
            app_lines = sum(
                (data["file_statistics"].get(f, {}) or {}).get("lines", 0)
                for f in files
                if isinstance(data["file_statistics"].get(f), dict)
            )
            summary["total_lines_scanned_app_only"] = app_lines
            if app_lines:
                summary["debt_density"] = round(len(kept) / app_lines * 100, 2)
    data["filter"] = {
        "script": "scripts/filter-debt-app-only.py",
        "app_prefixes": list(APP_PREFIXES),
        "exclude_prefixes": list(EXCLUDE_PREFIXES),
        "dropped_out_of_scope": dropped_scope,
        "dropped_noise": dropped_noise,
    }
    with open(args.output, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"kept {len(kept)} / dropped: scope={dropped_scope} noise={dropped_noise}")


if __name__ == "__main__":
    main()
