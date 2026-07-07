import time

from curl_cffi import requests

# e-ipo.co.id sits behind Cloudflare bot protection that fingerprints the TLS
# handshake; a plain requests/urllib3 client is 403'd regardless of User-Agent.
# curl_cffi impersonates a real browser's TLS/JA3 fingerprint so the request is
# accepted. UA is still exported for prices.py (Yahoo, which is not protected).
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
BASE = "https://e-ipo.co.id"
_session = requests.Session(impersonate="chrome")
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
