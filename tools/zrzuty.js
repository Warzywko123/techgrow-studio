#!/usr/bin/env node
/* Kontrola wygladu: zrzuty ekranu kazdej podstrony na komputerze i telefonie
   plus raport bledow, ktorych nie widac golym okiem.

   Uruchom z katalogu projektu:

       npm install                         # raz (instaluje Playwright)
       npx playwright install chromium     # raz, na wlasnym komputerze
       npm run zrzuty                      # wszystkie podstrony
       npm run zrzuty -- oferta kontakt    # tylko wybrane

   Wynik w katalogu zrzuty/ (nie trafia do gita):
     zrzuty/<strona>-komputer.png, zrzuty/<strona>-telefon.png — cala strona,
     zrzuty/raport.txt — to samo, co wypisuje konsola.

   Co sprawdza poza samym obrazkiem:
     - bledy JS (konsola i niezlapane wyjatki),
     - pliki z naszego serwera, ktore zwrocily blad (np. literowka w sciezce),
     - poziome przewijanie — cos wystaje poza ekran (klasyka na telefonie),
     - obrazki bez tekstu alternatywnego.
   Kod wyjscia 1, jesli cokolwiek z tej listy wystapilo.

   Strona jest serwowana lokalnie, a zapytania na zewnatrz (Google Analytics)
   sa blokowane — zrzut nie zalezy od internetu. Baner cookies i zaczepka czatu
   sa wylaczone (jak u powracajacego goscia), zeby nie zaslanialy strony. */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Brak Playwright. Zainstaluj:  npm install && npx playwright install chromium');
  process.exit(2);
}

const BAZA = path.resolve(__dirname, '..');
const WYNIK = path.join(BAZA, 'zrzuty');

const EKRANY = {
  komputer: { viewport: { width: 1440, height: 900 } },
  telefon: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// Choreografia hero na stronie glownej trwa ~11 s; reszta stron potrzebuje chwili
// na fonty i wejscia ScrollTriggera.
const CZEKAJ_MS = { index: 12000 };
const CZEKAJ_DOMYSLNIE = 1500;

const TYPY = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function serwer() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const plik = path.join(BAZA, p);
      if (!plik.startsWith(BAZA + path.sep) || !fs.existsSync(plik) || fs.statSync(plik).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'Content-Type': TYPY[path.extname(plik)] || 'application/octet-stream' });
      fs.createReadStream(plik).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

// Przewija strone do konca i z powrotem, zeby ScrollTrigger odpalil wejscia
// wszystkich sekcji — inaczej na zrzucie calej strony bylyby puste dziury.
async function przewin(page) {
  await page.evaluate(async () => {
    const krok = Math.round(window.innerHeight * 0.6);
    const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
    // 'instant', bo CSS scroll-behavior: smooth zamienilby kazdy skok w animacje
    // i zrzut lapalby strone (oraz przyklejone menu) w polowie drogi.
    const idz = (top) => window.scrollTo({ top, behavior: 'instant' });
    for (let y = 0; y < document.documentElement.scrollHeight; y += krok) {
      idz(y);
      await pauza(150);
    }
    idz(document.documentElement.scrollHeight);
    await pauza(600);
    idz(0);
    await pauza(1000);
  });
}

async function main() {
  const filtr = process.argv.slice(2).map((a) => a.replace(/\.html$/, ''));
  const strony = fs.readdirSync(BAZA)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .filter((s) => !filtr.length || filtr.includes(s))
    .sort();
  if (!strony.length) {
    console.error('Nie ma takiej strony: ' + filtr.join(', '));
    process.exit(2);
  }

  fs.mkdirSync(WYNIK, { recursive: true });
  const s = await serwer();
  const adres = 'http://127.0.0.1:' + s.address().port;
  const przegladarka = await chromium.launch();
  const raport = [];
  let problemy = 0;

  for (const strona of strony) {
    for (const [nazwa, ustawienia] of Object.entries(EKRANY)) {
      const kontekst = await przegladarka.newContext({ ...ustawienia, locale: 'pl-PL' });
      await kontekst.addInitScript(() => {
        try {
          localStorage.setItem('tg-cookie-consent', 'denied');
          sessionStorage.setItem('tg-czat', JSON.stringify({ zachecono: true }));
        } catch (e) { /* bez storage zrzut i tak powstanie, tylko z banerem */ }
      });
      await kontekst.route('**/*', (r) => (r.request().url().startsWith(adres) ? r.continue() : r.abort()));

      const page = await kontekst.newPage();
      const bledy = [];
      page.on('console', (m) => {
        // 404 na naszych plikach zglasza nizej obsluga odpowiedzi — tu bylby duplikat
        if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) bledy.push('konsola: ' + m.text());
      });
      page.on('pageerror', (e) => bledy.push('wyjatek: ' + e.message));
      page.on('response', (r) => {
        if (r.url().startsWith(adres) && r.status() >= 400) bledy.push(`HTTP ${r.status()}: ${r.url().slice(adres.length)}`);
      });

      await page.goto(`${adres}/${strona}.html`, { waitUntil: 'load' });
      await page.waitForTimeout(CZEKAJ_MS[strona] || CZEKAJ_DOMYSLNIE);
      await przewin(page);

      // Szerokosc ekranu z ustawien, nie window.innerWidth: na telefonie Chromium
      // rozszerza obszar strony do za szerokiej zawartosci i innerWidth rosnie razem z nia.
      const pomiary = await page.evaluate((szer) => {
        const wystaja = [];
        if (document.documentElement.scrollWidth > szer) {
          document.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > szer + 1 && getComputedStyle(el).position !== 'fixed') {
              wystaja.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '') +
                ` (prawa krawedz ${Math.round(r.right)}px)`);
            }
          });
        }
        const bezAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src'));
        return { przewijanieWPoziomie: document.documentElement.scrollWidth - szer, wystaja: wystaja.slice(0, 5), bezAlt };
      }, ustawienia.viewport.width);

      if (pomiary.przewijanieWPoziomie > 0) {
        bledy.push(`strona przewija sie w poziomie o ${pomiary.przewijanieWPoziomie}px; wystaje m.in.: ${pomiary.wystaja.join(', ') || '?'}`);
      }
      pomiary.bezAlt.forEach((src) => bledy.push('obrazek bez alt: ' + src));

      const plik = path.join(WYNIK, `${strona}-${nazwa}.png`);
      await page.screenshot({ path: plik, fullPage: true });
      await kontekst.close();

      problemy += bledy.length;
      const linia = `${bledy.length ? '✗' : '✓'} ${strona} (${nazwa}) → ${path.relative(BAZA, plik)}`;
      raport.push(linia, ...bledy.map((b) => '    ' + b));
      console.log([linia, ...bledy.map((b) => '    ' + b)].join('\n'));
    }
  }

  await przegladarka.close();
  s.close();
  raport.push('', problemy ? `Problemy: ${problemy}` : 'Bez problemow.');
  fs.writeFileSync(path.join(WYNIK, 'raport.txt'), raport.join('\n') + '\n');
  console.log('\n' + (problemy ? `Problemy: ${problemy}` : 'Bez problemow.'));
  process.exit(problemy ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
