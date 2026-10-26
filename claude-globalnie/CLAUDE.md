# Ustalenia Tymona — obowiązują w każdym projekcie

Tymon Grochowski prowadzi TechGrow Studio: strony internetowe, aplikacje,
grafiki, SEO i reklamy dla lokalnych firm (Piła, Poznań). Projekty to głównie
strony firmowe klientów — mają być szybkie, dobrze widoczne w Google i wyglądać
jak zaprojektowane przez człowieka, a nie wygenerowane.

Ustalenia konkretnego projektu (stos, kolory, decyzje) trzymaj w `CLAUDE.md`
tego repozytorium. Nowy projekt bez takiego pliku — załóż go, gdy zapadną
pierwsze decyzje.

## Komunikacja

- Po polsku, prosto, bez żargonu.
- Zanim pobierzesz nowe narzędzie, bibliotekę albo skill: najpierw powiedz, co
  robi, czy ma sens w tym projekcie i jaką ma licencję.

## Technologia

- Domyślnie lekko: statyczny HTML + Tailwind (budowany lokalnie, nie z CDN).
  Framework (React, Next.js) tylko wtedy, gdy projekt naprawdę go potrzebuje
  (aplikacja, panel, logika po stronie klienta) — nie „bo tak się robi”.
- Ruch: GSAP + ScrollTrigger (od 3.13 wszystkie wtyczki są darmowe, np.
  SplitText), płynne przewijanie: Lenis. Biblioteki i fonty hostowane u siebie,
  nie z CDN (RODO — CDN dostaje IP odwiedzającego przed zgodą).
- Efekty z React Bits (reactbits.dev) na stronie bez Reacta — przepisz na czysty
  JS (GSAP / Three.js / canvas), nie dokładaj Reacta dla jednego efektu.
- Zawsze: wersja na telefon, widoczny focus z klawiatury,
  `prefers-reduced-motion`, teksty alternatywne obrazków, baner cookies przed
  analityką.

## Wygląd — nie „AI slop”

O jakości decydują wybory projektowe, nie biblioteki.

1. Przy każdej pracy nad wyglądem korzystaj ze skilla `frontend-design`
   (oficjalny od Anthropic): najpierw plan — paleta, kroje, układ — i jego
   krytyka, dopiero potem kod.
2. Pracuj na inspiracjach: poproś o screenshoty stron (Awwwards, Godly,
   Land-book), które klient lub Tymon lubi, zamiast projektować w ciemno.
3. Mocna typografia i ograniczona paleta, odważniejszy układ niż „hero + 3 karty”.
4. Ruch z celem: jeden mocny moment zamiast tej samej animacji wjazdu na każdej
   sekcji.
5. Prawdziwe treści (realizacje, zdjęcia, liczby, język klienta) zamiast
   ogólników typu „innowacyjne rozwiązania”.

## Zanim uznasz zmianę za gotową

Po każdej zmianie widocznej dla odwiedzającego użyj skilla `kontrola-wygladu`:
zrzuty ekranu na komputerze i telefonie, obejrzyj je, napraw błędy z raportu.
