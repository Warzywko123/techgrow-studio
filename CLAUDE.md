# TechGrow Studio — ustalenia dla Claude

Strona firmowa Tymona (TechGrow Studio, Piła/Poznań). Szczegóły techniczne
(formularz, budowanie CSS, ikony, cache) są w `README.md` — przeczytaj go przed
zmianami. Tu są decyzje, które zapadły w rozmowach i obowiązują w każdej sesji.

## Stos — bez zmian bez wyraźnej prośby

- Statyczny HTML + Tailwind budowany lokalnie (`npm run build:css`). **Bez Reacta
  i bez frameworków** — szybkość i SEO to atut strony.
- Biblioteki leżą w `vendor/` (nie z CDN — RODO): GSAP 3.15.0 + ScrollTrigger,
  SplitText (pobrany, jeszcze nieużywany), Lenis 1.3.23 (tylko `index.html`),
  Three.js (scena 3D w hero).
- Po podbiciu wersji czegokolwiek w `vendor/` zmień `?v=` przy `<script src>`
  we wszystkich HTML (roczny cache). Po zmianie CSS — `style.css?v=`.

## Decyzja: React Bits — nie

Komponenty z React Bits (reactbits.dev) wymagają Reacta. Jeśli Tymon chce efekt
stamtąd, **przepisz go na czysty JS** (GSAP / Three.js / canvas), nie dokładaj
Reacta. Wiele z nich i tak działa pod spodem na GSAP albo WebGL.

## Cel: strony, które nie wyglądają jak „AI slop”

O jakości decydują wybory projektowe, nie biblioteki. Przy każdej pracy nad
wyglądem:

1. Korzystaj ze skilla `frontend-design` (`.claude/skills/frontend-design`,
   oficjalny od Anthropic) — najpierw plan (paleta, kroje, układ), potem kod.
2. Najlepiej pracować na inspiracjach: poproś o screenshoty stron z
   Awwwards / Godly / Land-book, zamiast projektować „ładnie” w ciemno.
3. Ruch z celem: jeden mocny moment (np. nagłówek przez SplitText, przypięta
   sekcja) zamiast tej samej animacji wjazdu na każdej sekcji.
4. Prawdziwe treści (realizacje, zdjęcia, liczby, język Tymona) zamiast ogólników.

Wzorce na obecnej stronie, które skill `frontend-design` uznaje za typowe dla AI
i które warto przy okazji przemyśleć (nie zmieniaj ich bez zgody Tymona):
etykiety „KROK 01/02/03”, drobne napisy fontem mono, „→” doklejane do przycisków,
etykiety wersalikami nad nagłówkami (np. „OFERTA”, „DOKUMENT PRAWNY”).

## Zanim uznasz zmianę za gotową — kontrola wyglądu

Po każdej zmianie widocznej dla odwiedzającego użyj skilla `kontrola-wygladu`:
`npm run zrzuty` (albo `npm run zrzuty -- oferta kontakt`), obejrzyj zrzuty
z `zrzuty/` na komputerze i telefonie, napraw wszystko z `✗` w raporcie.

## Komunikacja

Tymon pisze po polsku — odpowiadaj po polsku, prosto, bez żargonu. Przed
pobieraniem nowych narzędzi czy bibliotek najpierw powiedz, co robią i czy mają
sens dla tej strony.
