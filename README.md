# TechGrow Studio — strona firmowa

Statyczny HTML. Zero frameworków. Vercel serwuje pliki tak, jak leżą — jedynym
wyjątkiem jest `api/kontakt.js` (obsługa formularza), opisany niżej.

## Formularz kontaktowy

Formularz jest na `kontakt.html` i `oferta.html`. Front to `js/formularz.js`
(wysyłka fetchem, bez przeładowania), backend to `api/kontakt.js` — jedna funkcja
serverless, którą Vercel wystawia automatycznie z katalogu `api/`. Maila wysyła
[Resend](https://resend.com) przez zwykły `fetch` do ich HTTP API, więc **nie ma
tu żadnej zależności npm** i `node_modules` na produkcji dalej nie istnieje.

### Zmienne środowiskowe (Vercel → Settings → Environment Variables)

| zmienna | wymagana | domyślnie | uwagi |
|---|---|---|---|
| `RESEND_API_KEY` | **tak** | — | klucz z resend.com; bez niego endpoint zwraca 500 |
| `KONTAKT_TO` | nie | `techgrowstudio@gmail.com` | adres, na który idą zgłoszenia |
| `KONTAKT_FROM` | nie | `Formularz TechGrow <onboarding@resend.dev>` | patrz niżej |

⚠️ **Dopóki domena nie jest zweryfikowana w Resendzie**, nadawcą musi zostać
`onboarding@resend.dev`, a odbiorcą **wyłącznie adres właściciela konta Resend**.
Czyli: konto w Resendzie trzeba założyć na `techgrowstudio@gmail.com`. Dopiero po
dodaniu rekordów DNS domeny w Resendzie można ustawić `KONTAKT_FROM` na własny
adres (np. `kontakt@techgrowstudio.pl`) i wysyłać gdziekolwiek.

### Zabezpieczenia (bez CAPTCHY, bo ta wysyłałaby dane do Google przed zgodą)

- **honeypot** — pole `firma` ukryte klasą `.pulapka`; wypełnione = udawany sukces,
  mail nie leci;
- **pomiar czasu** — formularz wysłany szybciej niż 3 s od wczytania strony jest
  traktowany jak bot (też udawany sukces);
- **limit 3 zgłoszeń / 10 minut na adres IP** — pamięć procesu, więc przy
  wygaszaniu funkcji bywa resetowana; to sito, nie zapora;
- walidacja po stronie serwera niezależna od tej w przeglądarce, usuwanie znaków
  sterujących (CRLF) i `reply_to` tylko z adresu, który przeszedł walidację.

Testy funkcji odpalisz bez Vercela — `node` z podstawionym `fetch`, patrz historia
zmian. Lokalny `npx serve` **nie uruchamia** katalogu `api/`, więc na `localhost`
formularz pokaże komunikat o błędzie wysyłki. To normalne.

## Ważne: CSS się buduje

Strona **nie** pobiera już Tailwinda z internetu. Cały arkusz jest zbudowany
lokalnie i leży w `css/style.css`.

Jeśli zmienisz klasy Tailwinda w HTML (np. dopiszesz `text-3xl` tam, gdzie go
wcześniej nie było), musisz przebudować CSS — inaczej nowa klasa nie zadziała:

```bash
npm install      # tylko za pierwszym razem
npm run build:css
```

Podczas dłuższej pracy wygodniej odpalić tryb czuwania — przebudowuje się sam
po każdym zapisie pliku:

```bash
npm run watch:css
```

### ⚠️ Po zmianie CSS podbij `?v=` w każdym pliku HTML

Arkusz jest linkowany jako `css/style.css?v=1` i ma **roczny cache** (`vercel.json`).
Bez podbicia numeru stały odwiedzający dostanie nowy HTML ze starym arkuszem —
czyli rozjechany układ. Przy każdej zmianie w `src/`:

```bash
npm run build:css && sed -i '' 's/style\.css?v=[0-9]*/style.css?v=7/' *.html
```

(podstaw kolejny numer; sprawdź `grep -c 'style.css?v=' *.html` — musi być 8 trafień).

**Nie edytuj `css/style.css` ręcznie** — przy najbliższym budowaniu zmiany znikną.
Źródła są w `src/`:

| plik | co zawiera |
|---|---|
| `src/input.css` | spina wszystko do kupy |
| `src/fonty.css` | `@font-face` dla krojów z `fonts/` |
| `src/ikony.css` | ikony Phosphor (tylko te używane) |
| `src/lenis.css` | style biblioteki płynnego przewijania |

Kolory i kroje siedzą w `tailwind.config.js`.

## Co jest hostowane u nas, a nie z CDN

Wszystko poza Google Analytics. Kroje pisma (`fonts/`), ikony i biblioteki JS
(`vendor/`) leżą na naszym serwerze. Powód jest podwójny:

- **RODO** — przy wczytywaniu z `fonts.gstatic.com` czy `unpkg.com` przeglądarka
  odwiedzającego wysyłała jego adres IP do tych firm, zanim ktokolwiek wyraził
  zgodę. Sąd w Monachium zasądził w 2022 r. odszkodowanie właśnie za Google Fonts.
- **Szybkość** — mniej połączeń do obcych serwerów i mniej danych do pobrania.

Jeśli kiedyś podbijesz wersję biblioteki w `vendor/`, pamiętaj, że te pliki mają
roczny cache (`vercel.json`) — zmień wtedy `?v=` przy `<script src>` we wszystkich
plikach HTML (np. `gsap.min.js?v=3.15.0`), żeby przeglądarki zobaczyły nową
wersję. Inaczej stały odwiedzający może dostać starą wersję jednego pliku i nową
drugiego.

GSAP jest w wersji 3.15.0. Od 3.13 wszystkie wtyczki są darmowe, dlatego w
`vendor/` leży też `SplitText.min.js` (animacja tekstu po literach, słowach i
liniach). Na razie żadna strona go nie wczytuje — dołącz go po
`gsap.min.js` tylko tam, gdzie go użyjesz.

## Kontrola wyglądu (zrzuty ekranu)

```bash
npm install                        # raz
npx playwright install chromium    # raz, na własnym komputerze
npm run zrzuty                     # wszystkie podstrony (~2 min)
npm run zrzuty -- oferta kontakt   # tylko wybrane
```

`tools/zrzuty.js` serwuje stronę lokalnie, robi zrzut całej strony na komputerze
(1440 px) i telefonie (390 px) i zapisuje je w `zrzuty/` (poza gitem) razem z
raportem. Wyłapuje błędy JS, brakujące pliki, poziome przewijanie i obrazki bez
`alt` — wtedy kończy się kodem 1.

## Skille dla Claude Code (`.claude/skills/`)

| skill | co robi |
|---|---|
| `frontend-design` | oficjalny skill Anthropic (Apache 2.0, `anthropics/skills`) — zasady projektowania, które nie wyglądają jak generyczna strona z AI |
| `kontrola-wygladu` | każe Claude'owi po każdej zmianie wyglądu uruchomić `npm run zrzuty`, obejrzeć zrzuty i poprawić to, co widać |

Aktualizacja skilla Anthropic: podmień `SKILL.md` na nowszy z
`github.com/anthropics/skills/tree/main/skills/frontend-design`.

## Ustawienia Claude dla wszystkich projektów (`claude-globalnie/`)

Ogólne ustalenia (`claude-globalnie/CLAUDE.md`) i oba skille w wersji dla
dowolnego projektu. `instaluj.sh` kopiuje je do `~/.claude/`, skąd Claude Code
czyta je w każdym repozytorium:

```bash
curl -fsSL https://raw.githubusercontent.com/Warzywko123/techgrow-studio/main/claude-globalnie/instaluj.sh | bash
```

- **Claude Code w chmurze (claude.ai/code)** — kontener startuje za każdym razem
  od zera, więc tę linijkę trzeba wpisać w *Setup script* środowiska (menu
  środowiska → Edit). Wtedy działa w każdej nowej sesji, w każdym repo.
- **Claude Code na komputerze** — wystarczy raz w terminalu.

Skrypt można odpalać wielokrotnie: w `~/.claude/CLAUDE.md` podmienia tylko swój
blok, resztę zostawia. Zmiany wprowadzaj w `claude-globalnie/` i scalaj do
`main` — instalacja pobiera pliki z gałęzi `main`.

## Ikony

W `fonts/phosphor-light-subset.woff2` jest odchudzony font Phosphor — zawiera
**tylko te ikony, które faktycznie są na stronie** (31 sztuk zamiast ~1500).
Jeśli dodasz w HTML nową ikonę (`<i class="ph-light ph-cos-nowego">`), sam font
jej nie ma i nic się nie wyświetli — trzeba wtedy przebudować podzbiór.
