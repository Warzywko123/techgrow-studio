---
name: kontrola-wygladu
description: Sprawdza wyglad strony po kazdej zmianie widocznej dla odwiedzajacego — HTML, klas Tailwinda, CSS w src/, animacji GSAP/Lenis, obrazkow, fontow, bibliotek w vendor/. Robi zrzuty ekranu wszystkich podstron (komputer i telefon), wylapuje bledy JS, brakujace pliki, poziome przewijanie i obrazki bez alt, a potem ocenia zrzuty wzrokiem. Uzyj przed kazdym commitem, ktory zmienia wyglad lub zachowanie strony.
---

# Kontrola wygladu

Kod, ktory „powinien dzialac”, to nie dowod. Zanim zglosisz zmiane jako gotowa,
zobacz strone tak, jak zobaczy ja odwiedzajacy.

## Kroki

1. Jesli zmieniles klasy Tailwinda albo cokolwiek w `src/`: `npm run build:css`
   (i podbij `style.css?v=` — patrz README).
2. Uruchom zrzuty. Caly zestaw trwa ok. 2 minut, wiec przy drobnej zmianie
   ogranicz sie do dotknietych podstron:

   ```bash
   npm run zrzuty                       # wszystkie
   npm run zrzuty -- oferta kontakt     # wybrane (nazwy plikow bez .html)
   ```

   Brak Playwrighta → `npm install` (lokalnie dodatkowo
   `npx playwright install chromium`).
3. Przeczytaj raport (`zrzuty/raport.txt`). Kazda linia z `✗` to problem do
   naprawienia, nie do skomentowania — bledy JS, 404 na naszych plikach,
   poziome przewijanie, obrazki bez `alt`.
4. Obejrzyj zrzuty narzedziem Read (`zrzuty/<strona>-komputer.png`,
   `zrzuty/<strona>-telefon.png`) — przynajmniej te podstrony, ktore zmieniales,
   zawsze w obu wersjach. Szukaj:
   - nachodzacych na siebie elementow, uciętego tekstu, pustych dziur po
     sekcjach, ktore sie nie pojawily,
   - zlego lamania naglowkow na telefonie (pojedyncze slowo w ostatniej linii),
   - niespojnych odstepow, kolorow i fontow wzgledem reszty strony,
   - wzorcow „AI slop” opisanych w skillu `frontend-design`.
5. Popraw, uruchom ponownie, obejrzyj ponownie. Dopiero czysty raport i zrzuty
   bez uwag = gotowe.
6. W podsumowaniu dla uzytkownika napisz, ktore podstrony i ekrany obejrzales
   i co poprawiles po drodze.

## Porownanie przed/po

Przy zmianach, ktore nie powinny niczego zmienic wizualnie (aktualizacja
biblioteki, refaktor), zrob zrzuty przed zmiana, skopiuj `zrzuty/` w bezpieczne
miejsce i porownaj piksele po zmianie (np. Pillow: `ImageChops.difference`).
Zrzuty sa powtarzalne — ta sama strona daje ten sam obraz; roznice pojawiaja sie
tylko w scenie 3D na stronie glownej (antyaliasing WebGL, pojedyncze piksele).

## Czego narzedzie nie widzi

- Baner cookies i zaczepka czatu sa celowo wylaczone (gosc powracajacy). Gdy
  zmieniasz ktorys z nich, sprawdz go osobno.
- Animacje widac tylko w stanie koncowym. Ruch (plynnosc, tempo, kolejnosc)
  trzeba ocenic na zywo albo nagrac wideo Playwrightem (`recordVideo`).
- `api/` (formularz, czat) nie dziala na lokalnym serwerze.
