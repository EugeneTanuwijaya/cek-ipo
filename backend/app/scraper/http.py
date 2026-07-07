import time

import requests

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
BASE = "https://e-ipo.co.id"
_session = requests.Session()
_session.headers["User-Agent"] = UA
_last = 0.0


def fetch(url: str, delay: float = 2.0) -> str:
    """GET url with a browser User-Agent, enforcing a minimum delay since the
    previous call (politeness towards e-ipo.co.id)."""
    global _last
    wait = delay - (time.monotonic() - _last)
    if wait > 0:
        time.sleep(wait)
    r = _session.get(url, timeout=30)
    _last = time.monotonic()
    r.raise_for_status()
    return r.text
