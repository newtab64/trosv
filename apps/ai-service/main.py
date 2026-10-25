"""Backward-compatible entrypoint re-exporting from app.main package."""

from app.main import FAKE_MODE, app

__all__ = ["app", "FAKE_MODE"]
