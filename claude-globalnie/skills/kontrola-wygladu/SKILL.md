---
name: kontrola-wygladu
description: Sprawdza wyglad strony internetowej po kazdej zmianie widocznej dla odwiedzajacego (HTML, CSS, Tailwind, komponenty, animacje, obrazki, fonty, biblioteki). Robi zrzuty ekranu podstron na komputerze i telefonie, wylapuje bledy JS, brakujace pliki, poziome przewijanie i obrazki bez alt, a potem ocenia zrzuty wzrokiem. Uzyj przed kazdym commitem, ktory zmienia wyglad lub zachowanie strony — w kazdym projekcie.
---

# Kontrola wygladu

Kod, ktory „powinien dzialac”, to nie dowod. Zanim zglosisz zmiane jako gotowa,
zobacz strone tak, jak zobaczy ja odwiedzajacy.

## 1. Zrob zrzuty

- **Projekt ma wlasne narzedzie** (`npm run zrzuty` w `package.json`) — uzyj go,
  jest dopasowane do projektu (np. wylacza baner cookies i czat).
- **W przeciwnym razie** uzyj skryptu z tego skilla (`zrzuty.js` obok tego pliku,
  zwykle `~/.claude/skills/kontrola-wygladu/zrzuty.js`):

  ```bash
  S=~/.claude/skills/kontrola-wygladu/zrzuty.js
  node $S                                   # statyczny HTML w biezacym katalogu
  node $S oferta kontakt                    # tylko wybrane podstrony
  node $S --katalog=dist                    # zbudowana strona w dist/
  node $S --url=http://localhost:3000 / /oferta   # wlasny serwer (Next, Vite) — uruchom go najpierw
  node $S --czekaj=8000                     # dluzsze animacje wejscia
  ```

  Brak Playwrighta: `npm install -D playwright` (lokalnie dodatkowo
  `npx playwright install chromium`). W chmurze Claude Code Playwright i Chromium
  zwykle juz sa — nie instaluj innej wersji.
  Dopisz `zrzuty/` do `.gitignore` projektu, jesli go tam nie ma.

Przy drobnej zmianie ogranicz sie do dotknietych podstron — pelny zestaw trwa.

## 2. Przeczytaj raport

`zrzuty/raport.txt`: kazda linia z `✗` to problem do naprawienia — bledy JS,
bledy HTTP na plikach strony, poziome przewijanie (cos wystaje poza ekran
telefonu), obrazki bez `alt`.

## 3. Obejrzyj zrzuty

Narzedziem Read: `zrzuty/<strona>-komputer.png` i `zrzuty/<strona>-telefon.png`
— zawsze obie wersje zmienianych podstron. Szukaj:

- nachodzacych na siebie elementow, ucietego tekstu, pustych dziur po sekcjach,
  ktore sie nie pojawily,
- zlego lamania naglowkow na telefonie (jedno slowo w ostatniej linii),
- niespojnych odstepow, kolorow i krojow wzgledem reszty strony,
- wzorcow „AI slop” opisanych w skillu `frontend-design`.

## 4. Popraw i powtorz

Dopiero czysty raport i zrzuty bez uwag = gotowe. W podsumowaniu napisz, ktore
podstrony i ekrany obejrzales i co poprawiles po drodze.

## Porownanie przed/po

Przy zmianach, ktore nie powinny niczego zmienic wizualnie (aktualizacja
biblioteki, refaktor): zrzuty przed zmiana, kopia `zrzuty/` w bezpieczne miejsce,
zrzuty po zmianie, porownanie pikseli (np. Pillow `ImageChops.difference`).
Scena WebGL/3D moze roznic sie pojedynczymi pikselami — to nie regresja.

## Czego zrzut nie pokaze

- Ruchu — animacje widac w stanie koncowym. Plynnosc i tempo ocen na zywo albo
  nagraj wideo Playwrightem (`recordVideo`).
- Banerow i okienek pojawiajacych sie po czasie lub tylko przy pierwszej wizycie
  — sprawdz je osobno, gdy je zmieniasz.
- Funkcji serwerowych (formularze, API), jesli serwer ich nie uruchamia.
