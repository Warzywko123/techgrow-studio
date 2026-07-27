#!/usr/bin/env python3
"""Buduje odchudzony font Phosphor: tylko ikony, ktore faktycznie sa w HTML.

Uruchom z katalogu projektu:

    pip install fonttools brotli      # raz
    python3 tools/zbuduj-ikony.py
    npm run build:css                 # zeby nowy CSS trafil do css/style.css

Wynik: fonts/phosphor-light-subset.woff2 + src/ikony.css
"""
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

WERSJA = "2.1.1"
BAZA = pathlib.Path(__file__).resolve().parent.parent

pyftsubset = shutil.which("pyftsubset")
if not pyftsubset:
    sys.exit("Brak pyftsubset. Zainstaluj:  pip install fonttools brotli")

# 1. Ktore ikony sa w uzyciu?
uzywane = set()
for p in BAZA.glob("*.html"):
    uzywane |= set(re.findall(r"\bph-([a-z0-9-]+)\b", p.read_text(encoding="utf-8")))
uzywane.discard("light")
if not uzywane:
    sys.exit("Nie znalazlem zadnej klasy ph-* w plikach HTML.")
print(f"Ikon w uzyciu: {len(uzywane)}")

tmp = pathlib.Path(tempfile.mkdtemp())
css_zrodlo = tmp / "phosphor.css"
ttf = tmp / "Phosphor-Light.ttf"

subprocess.run(["curl", "-sSL", "-o", str(css_zrodlo),
                f"https://unpkg.com/@phosphor-icons/web@{WERSJA}/src/light/style.css"], check=True)
subprocess.run(["curl", "-sSL", "-o", str(ttf),
                f"https://unpkg.com/@phosphor-icons/web@{WERSJA}/src/light/Phosphor-Light.ttf"], check=True)

# 2. Kod znaku dla kazdej ikony
kody = dict(re.findall(
    r'\.ph-light\.ph-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"',
    css_zrodlo.read_text(encoding="utf-8")))

brakujace = sorted(uzywane - kody.keys())
if brakujace:
    sys.exit(f"Nie znalazlem kodow dla ikon: {brakujace}")

wybrane = sorted(uzywane)
punkty = ",".join("U+" + kody[i].upper() for i in wybrane)

# 3. Odchudzenie fontu
wyjscie = BAZA / "fonts" / "phosphor-light-subset.woff2"
wyjscie.parent.mkdir(exist_ok=True)
subprocess.run([pyftsubset, str(ttf), f"--unicodes={punkty}", "--flavor=woff2",
                "--layout-features=", "--no-hinting", "--desubroutinize",
                f"--output-file={wyjscie}"], check=True)

# 4. Minimalny CSS
linie = [
    "/* Ikony Phosphor - tylko te, ktorych uzywamy (font odchudzony lokalnie).",
    f"   Wygenerowane przez tools/zbuduj-ikony.py. Ikon: {len(wybrane)}. */",
    "",
    "@font-face {",
    "  font-family: 'Phosphor-Light';",
    "  font-style: normal;",
    "  font-weight: 400;",
    "  font-display: block;",
    "  src: url('../fonts/phosphor-light-subset.woff2') format('woff2');",
    "}",
    "",
    ".ph-light {",
    "  font-family: 'Phosphor-Light' !important;",
    "  speak: never;",
    "  font-style: normal;",
    "  font-weight: normal;",
    "  font-variant: normal;",
    "  text-transform: none;",
    "  line-height: 1;",
    "  -webkit-font-smoothing: antialiased;",
    "  -moz-osx-font-smoothing: grayscale;",
    "}",
    "",
] + [f'.ph-light.ph-{i}:before {{ content: "\\{kody[i]}"; }}' for i in wybrane] + [""]

(BAZA / "src" / "ikony.css").write_text("\n".join(linie), encoding="utf-8")
shutil.rmtree(tmp, ignore_errors=True)

print(f"Font: {wyjscie.stat().st_size / 1024:.1f} KB")
print("Ikony:", ", ".join(wybrane))
print("\nTeraz uruchom: npm run build:css")
