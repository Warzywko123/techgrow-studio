#!/usr/bin/env python3
"""Pobiera kroje z Google Fonts na dysk i generuje lokalny CSS (@font-face).

UWAGA: Google oddaje fonty zmienne (variable) - ten sam plik dla kazdej grubosci.
Skrypt zapisuje je osobno, wiec po uruchomieniu warto sprawdzic duplikaty
(md5 fonts/*.woff2), zostawic jeden plik na rodzine+podzbior i w src/fonty.css
podac zakres, np. font-weight: 400 600. Tak wlasnie wyglada obecny stan repo.

Po tym zabiegu przeglądarka odwiedzającego nie łączy się już z serwerami Google
przy samym wejściu na stronę — a to właśnie było naruszenie RODO.
"""
import pathlib
import re
import subprocess
import sys

BAZA = pathlib.Path(__file__).resolve().parent.parent
KATALOG_FONTOW = BAZA / "fonts"
WYJSCIE_CSS = BAZA / "src" / "fonty.css"

URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Space+Grotesk:wght@500;600;700"
    "&family=Plus+Jakarta+Sans:wght@400;500;600"
    "&family=JetBrains+Mono:wght@400;500"
    "&display=swap"
)

# UA nowoczesnej przeglądarki → Google odda woff2 (najmniejszy format)
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Interesują nas tylko podzbiory znaków, których faktycznie używa polska strona.
PODZBIORY = {"latin", "latin-ext"}

KATALOG_FONTOW.mkdir(exist_ok=True)
WYJSCIE_CSS.parent.mkdir(exist_ok=True)

css = subprocess.run(
    ["curl", "-sSL", "-A", UA, URL], capture_output=True, text=True, check=True
).stdout

if "@font-face" not in css:
    print("Nie udało się pobrać CSS z Google Fonts", file=sys.stderr)
    sys.exit(1)

# Google poprzedza każdy blok komentarzem z nazwą podzbioru, np. /* latin-ext */
kawalki = re.split(r"/\*\s*([\w\[\]-]+)\s*\*/", css)
# kawalki: ['', 'latin-ext', '@font-face{...}', 'latin', '@font-face{...}', ...]

wynik = [
    "/* Kroje pisma hostowane lokalnie — bez połączenia z fonts.gstatic.com.",
    "   Wygenerowane skryptem, nie edytuj ręcznie. */",
    "",
]
pobrane = 0
pominiete = 0

for i in range(1, len(kawalki) - 1, 2):
    podzbior = kawalki[i]
    blok = kawalki[i + 1]
    if podzbior not in PODZBIORY:
        pominiete += 1
        continue
    m = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", blok)
    rodzina = re.search(r"font-family:\s*'([^']+)'", blok)
    waga = re.search(r"font-weight:\s*([\d ]+);", blok)
    if not (m and rodzina and waga):
        print(f"  pomijam blok bez kompletu danych ({podzbior})")
        continue
    zrodlo = m.group(1)
    nazwa = (
        rodzina.group(1).lower().replace(" ", "-")
        + "-"
        + waga.group(1).strip().replace(" ", "-")
        + "-"
        + podzbior
        + ".woff2"
    )
    cel = KATALOG_FONTOW / nazwa
    if not cel.exists():
        subprocess.run(["curl", "-sSL", "-o", str(cel), zrodlo], check=True)
        pobrane += 1
    blok_lokalny = blok.replace(zrodlo, f"../fonts/{nazwa}")
    wynik.append(f"/* {rodzina.group(1)} {waga.group(1)} — {podzbior} */")
    wynik.append(blok_lokalny.strip())
    wynik.append("")

WYJSCIE_CSS.write_text("\n".join(wynik) + "\n", encoding="utf-8")

print(f"Pobrano plików: {pobrane}, pominięto podzbiorów: {pominiete}")
print(f"CSS: {WYJSCIE_CSS}")
for f in sorted(KATALOG_FONTOW.iterdir()):
    print(f"  {f.stat().st_size / 1024:6.1f} KB  {f.name}")
