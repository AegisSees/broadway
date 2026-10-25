"""A polite client for the community Deadlock API (https://api.deadlock-api.com).

What we know (API_GUIDE.md, checked 8-9 Oct 2026): CORS is open, analytics endpoints share 200 requests per minute
per IP, long URLs fail (send account ids 100 at a time), and an unknown match id answers 404. The bulk match endpoint's
own limit is not documented in our notes, so the default here is slow (one request every 2 s) and every 429 is
honoured with its Retry-After. Raise `min_interval_s` only after reading the limits on https://api.deadlock-api.com/docs.

Every response is cached on disk by URL, so re-running a pull costs nothing and an interrupted pull resumes.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

import requests

DEFAULT_BASE = "https://api.deadlock-api.com"


class DeadlockApi:
    def __init__(
        self,
        base: str | None = None,
        cache_dir: str | Path = "data/cache",
        min_interval_s: float = 2.0,
        max_retries: int = 6,
        api_key: str | None = None,
        timeout_s: float = 60.0,
    ):
        self.base = (base or os.environ.get("API_BASE") or DEFAULT_BASE).rstrip("/")
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.min_interval_s = min_interval_s
        self.max_retries = max_retries
        self.timeout_s = timeout_s
        self.session = requests.Session()
        self.session.headers["accept"] = "application/json"
        self.session.headers["user-agent"] = "broadway-ml (fan project; offline training)"
        key = api_key or os.environ.get("DEADLOCK_API_KEY")
        if key:
            self.session.headers[os.environ.get("DEADLOCK_API_KEY_HEADER", "x-api-key")] = key
        self._last_call = 0.0
        self.calls = 0

    def _cache_path(self, url: str) -> Path:
        return self.cache_dir / (hashlib.sha1(url.encode()).hexdigest() + ".json")

    def get(self, path: str, params: dict[str, Any] | None = None, use_cache: bool = True) -> Any:
        """GET `path` with `params`; returns parsed JSON, or None for a 404."""
        req = requests.Request("GET", self.base + path, params=_clean(params)).prepare()
        url = req.url or ""
        cached = self._cache_path(url)
        if use_cache and cached.exists():
            return json.loads(cached.read_text())

        for attempt in range(self.max_retries):
            wait = self.min_interval_s - (time.monotonic() - self._last_call)
            if wait > 0:
                time.sleep(wait)
            self._last_call = time.monotonic()
            self.calls += 1
            try:
                r = self.session.get(url, timeout=self.timeout_s)
            except requests.RequestException:
                time.sleep(2 ** attempt)
                continue
            if r.status_code == 404:
                return None
            if r.status_code == 429 or r.status_code >= 500:
                retry_after = r.headers.get("retry-after")
                time.sleep(float(retry_after) if retry_after and retry_after.isdigit() else 2 ** (attempt + 1))
                continue
            r.raise_for_status()
            data = r.json()
            if use_cache:
                cached.write_text(json.dumps(data))
            return data
        raise RuntimeError(f"Gave up after {self.max_retries} tries: {url}")


def _clean(params: dict[str, Any] | None) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in (params or {}).items():
        if v is None:
            continue
        if isinstance(v, bool):
            out[k] = "true" if v else "false"
        elif isinstance(v, (list, tuple)):
            out[k] = ",".join(str(x) for x in v)
        else:
            out[k] = v
    return out


def chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]
