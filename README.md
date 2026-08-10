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
roczny cache (`vercel.json`) — zmień wtedy nazwę pliku, np. `gsap-3.13.min.js`,
żeby przeglądarki zobaczyły nową wersję.

## Ikony

W `fonts/phosphor-light-subset.woff2` jest odchudzony font Phosphor — zawiera
**tylko te ikony, które faktycznie są na stronie** (31 sztuk zamiast ~1500).
Jeśli dodasz w HTML nową ikonę (`<i class="ph-light ph-cos-nowego">`), sam font
jej nie ma i nic się nie wyświetli — trzeba wtedy przebudować podzbiór.
