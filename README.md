# TechGrow Studio — strona firmowa

Statyczny HTML. Zero frameworków, zero backendu. Vercel serwuje pliki tak, jak leżą.

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
npm run build:css && sed -i '' 's/style\.css?v=[0-9]*/style.css?v=2/' *.html
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
