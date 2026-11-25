#!/usr/bin/env python3
"""One-off public FCF connectivity diagnostic. No acta content is saved."""
import urllib.request
import urllib.error
from urllib.parse import urlparse
import re

URL = "https://www.fcf.cat/ca/partit/2026-2027/cadet-segona-divisio-s15/grup-14/jornada-8/sant-vicenc-dels-horts-assoc-futbol-b-2c15-vs-pa-barc-sant-vicenc-horts-a-2c15"
try:
    req = urllib.request.Request(URL, headers={"User-Agent": "FantasyPenyaConnectivityTest/1.0", "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=20) as response:
        print("HTTP:", response.status)
        print("Host:", urlparse(response.url).hostname)
        print("Content type:", response.headers.get("Content-Type"))
        data = response.read(2000000).decode("utf-8", errors="replace")
        print("Characters:", len(data))
        for marker in ("FINALITZAT", "GOLS", "TITULARS", "SUPLENTS", "EQUIP TÈCNIC"):
            print(marker, bool(re.search(re.escape(marker), data, re.I)))
except urllib.error.HTTPError as exc:
    print("HTTP:", exc.code)
    print("Access unavailable; stop without retrying.")
    raise SystemExit(1)
except (urllib.error.URLError, TimeoutError) as exc:
    print("Connection unavailable:", type(exc).__name__)
    raise SystemExit(1)
