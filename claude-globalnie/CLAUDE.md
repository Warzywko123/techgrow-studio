# Ustalenia Tymona — obowiązują w każdym projekcie

Tymon Grochowski prowadzi TechGrow Studio: strony internetowe, aplikacje,
grafiki, SEO i reklamy dla lokalnych firm (Piła, Poznań). Projekty to głównie
strony firmowe klientów — mają być szybkie, dobrze widoczne w Google i wyglądać
jak zaprojektowane przez człowieka, a nie wygenerowane.

Techniczne ustalenia projektu (stos, kolory, kroje, decyzje) trzymaj w
`CLAUDE.md` tego repozytorium. Większość repo jest **publiczna**, więc dane
klienta (kontakty, ceny, rozmowy, dostępy) nigdy tam nie trafiają — te idą do
`~/.claude/notatki/`.

Kontrola wyglądu: jeden skill na raz. Jeśli masz starszy własny skill do
podglądu (np. `/podglad`), przenieś z niego to, czego brakuje, do swoich zasad
poza tym blokiem, i używaj `kontrola-wygladu`.

## Komunikacja

- Po polsku, prosto, bez żargonu.
- Zanim pobierzesz nowe narzędzie, bibliotekę albo skill: najpierw powiedz, co
  robi, czy ma sens w tym projekcie i jaką ma licencję.

## Technologia

- **Nowe projekty: Next.js (App Router) + React + TypeScript + Tailwind**,
  wdrażane na Vercel. Strony bez logiki serwerowej generuj statycznie (SSG /
  `output: 'export'`) — szybkość i SEO jak przy czystym HTML. Najnowsze
  stabilne wersje; przed startem sprawdź aktualne wersje i dokumentację, nie
  pisz z pamięci.
- Next.js po swojemu: `next/image` (obrazki), `next/font` (fonty hostowane
  u siebie — RODO), Metadata API (SEO, Open Graph), Server Components domyślnie,
  `'use client'` tylko tam, gdzie jest interakcja.
- **Istniejące projekty zostają na swoim stosie** (np. statyczny HTML) — nie
  przepisuj ich na Next.js bez wyraźnej prośby.
- Ruch: GSAP + ScrollTrigger (od 3.13 wszystkie wtyczki są darmowe, np.
  SplitText; w React przez `@gsap/react` i `useGSAP`), płynne przewijanie:
  Lenis. Biblioteki i fonty hostowane u siebie, nie z CDN (RODO — CDN dostaje
  IP odwiedzającego przed zgodą).
- React Bits (reactbits.dev) w projektach Next.js — śmiało, komponenty w wersji
  TypeScript + Tailwind. Na stronie bez Reacta efekt przepisz na czysty JS.

## Nowoczesny kod

- `const` domyślnie, `let` tylko gdy zmienna się zmienia, **nigdy `var`**.
- Moduły ES (`import`/`export`), `async`/`await` zamiast łańcuchów `.then()`,
  funkcje strzałkowe, `?.` i `??`, destrukturyzacja, template literals.
- TypeScript w trybie `strict`, bez `any`. Komponenty funkcyjne i hooki.
- Bez jQuery i bibliotek do rzeczy, które przeglądarka robi sama (`fetch`,
  `IntersectionObserver`, `dialog`, CSS `:has()`, `clamp()`, grid, container
  queries, `aspect-ratio`).
- Semantyczny HTML (`header`, `nav`, `main`, `section`, `button` zamiast
  klikalnego `div`), ESLint + Prettier w każdym nowym projekcie.
- W starym kodzie (np. z `var`) piszesz nowo dodane fragmenty nowocześnie;
  całych plików nie przepisujesz bez prośby.
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
