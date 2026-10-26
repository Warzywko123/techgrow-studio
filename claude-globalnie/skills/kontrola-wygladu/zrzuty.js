#!/usr/bin/env node
/* Kontrola wygladu dla dowolnego projektu: zrzuty calych stron na komputerze
   i telefonie plus raport bledow, ktorych nie widac golym okiem.

   Statyczna strona (pliki .html w katalogu) — serwuje ja sam:
       node zrzuty.js                       # wszystkie .html z biezacego katalogu
       node zrzuty.js --katalog=dist        # z innego katalogu (np. po buildzie)
       node zrzuty.js oferta kontakt        # tylko wybrane (bez .html)

   Projekt z wlasnym serwerem (Next.js, Vite...) — najpierw go uruchom:
       node zrzuty.js --url=http://localhost:3000 / /oferta /kontakt

   Opcje: --czekaj=ms (domyslnie 1500) — ile czekac na animacje po wczytaniu.

   Wynik: zrzuty/<strona>-komputer.png, zrzuty/<strona>-telefon.png, zrzuty/raport.txt
   w biezacym katalogu (dopisz zrzuty/ do .gitignore). Sprawdza bledy JS,
   pliki z bledem HTTP, poziome przewijanie i obrazki bez alt; kod wyjscia 1,
   jesli cokolwiek znalazl. Zapytania do innych domen (analityka) sa blokowane. */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');

function playwright() {
  for (const skad of [__filename, path.join(process.cwd(), 'package.json')]) {
    try { return createRequire(skad)('playwright'); } catch (e) { /* probujemy dalej */ }
  }
  try { return require('playwright'); } catch (e) { /* nizej komunikat */ }
  console.error('Brak Playwright. W projekcie:  npm install -D playwright && npx playwright install chromium');
  process.exit(2);
}
const { chromium } = playwright();

const opcje = {};
const reszta = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([a-z]+)=(.*)$/);
  if (m) opcje[m[1]] = m[2]; else reszta.push(a);
}
const CZEKAJ = Number(opcje.czekaj) || 1500;
const WYNIK = path.join(process.cwd(), 'zrzuty');

const EKRANY = {
  komputer: { viewport: { width: 1440, height: 900 } },
  telefon: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const TYPY = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function serwer(baza) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      let plik = path.join(baza, p);
      if (!fs.existsSync(plik) && fs.existsSync(plik + '.html')) plik += '.html'; // czyste adresy
      if (!plik.startsWith(baza + path.sep) || !fs.existsSync(plik) || fs.statSync(plik).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'Content-Type': TYPY[path.extname(plik).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(plik).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

// Przewija strone do konca i z powrotem, zeby animacje „przy przewijaniu”
// (ScrollTrigger, IntersectionObserver) odpalily — inaczej na zrzucie calej
// strony zostalyby puste dziury. 'instant', bo CSS scroll-behavior: smooth
// zamienilby kazdy skok w animacje i zrzut lapalby strone w polowie drogi.
async function przewin(page) {
  await page.evaluate(async () => {
    const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
    const idz = (top) => window.scrollTo({ top, behavior: 'instant' });
    const krok = Math.round(window.innerHeight * 0.6);
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
  let adres, s, strony;
  if (opcje.url) {
    adres = opcje.url.replace(/\/$/, '');
    strony = (reszta.length ? reszta : ['/']).map((p) => ({
      nazwa: p.replace(/^\/|\/$/g, '').replace(/[^a-z0-9-]+/gi, '_') || 'index',
      sciezka: p.startsWith('/') ? p : '/' + p,
    }));
  } else {
    const baza = path.resolve(opcje.katalog || '.');
    const filtr = reszta.map((a) => a.replace(/\.html$/, ''));
    strony = fs.readdirSync(baza)
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.replace(/\.html$/, ''))
      .filter((n) => !filtr.length || filtr.includes(n))
      .sort()
      .map((n) => ({ nazwa: n, sciezka: `/${n}.html` }));
    if (!strony.length) {
      console.error(`Brak plikow .html w ${baza}` + (filtr.length ? ` pasujacych do: ${filtr.join(', ')}` : '') +
        '\nProjekt z wlasnym serwerem? Uzyj --url=http://localhost:PORT');
      process.exit(2);
    }
    s = await serwer(baza);
    adres = 'http://127.0.0.1:' + s.address().port;
  }

  fs.mkdirSync(WYNIK, { recursive: true });
  const przegladarka = await chromium.launch();
  const raport = [];
  let problemy = 0;

  for (const { nazwa: strona, sciezka } of strony) {
    for (const [ekran, ustawienia] of Object.entries(EKRANY)) {
      const kontekst = await przegladarka.newContext({ ...ustawienia, locale: 'pl-PL' });
      await kontekst.route('**/*', (r) => (r.request().url().startsWith(adres) ? r.continue() : r.abort()));
      const page = await kontekst.newPage();
      const bledy = [];
      page.on('console', (m) => {
        // „Failed to load resource”: nasze 404 zglasza nizej obsluga odpowiedzi,
        // a zablokowane zapytania do innych domen to nasz wybor, nie blad strony
        if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) bledy.push('konsola: ' + m.text());
      });
      page.on('pageerror', (e) => bledy.push('wyjatek: ' + e.message));
      page.on('response', (r) => {
        if (r.url().startsWith(adres) && r.status() >= 400) bledy.push(`HTTP ${r.status()}: ${r.url().slice(adres.length)}`);
      });

      try {
        await page.goto(adres + sciezka, { waitUntil: 'load', timeout: 30000 });
      } catch (e) {
        bledy.push('nie udalo sie wczytac: ' + e.message.split('\n')[0]);
      }
      await page.waitForTimeout(CZEKAJ);
      await przewin(page).catch(() => {});

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
        return { nadmiar: document.documentElement.scrollWidth - szer, wystaja: wystaja.slice(0, 5), bezAlt };
      }, ustawienia.viewport.width).catch(() => ({ nadmiar: 0, wystaja: [], bezAlt: [] }));

      if (pomiary.nadmiar > 0) {
        bledy.push(`strona przewija sie w poziomie o ${pomiary.nadmiar}px; wystaje m.in.: ${pomiary.wystaja.join(', ') || '?'}`);
      }
      pomiary.bezAlt.forEach((src) => bledy.push('obrazek bez alt: ' + src));

      const plik = path.join(WYNIK, `${strona}-${ekran}.png`);
      await page.screenshot({ path: plik, fullPage: true }).catch((e) => bledy.push('zrzut: ' + e.message));
      await kontekst.close();

      problemy += bledy.length;
      const linie = [`${bledy.length ? '✗' : '✓'} ${strona} (${ekran}) → ${path.relative(process.cwd(), plik)}`,
        ...bledy.map((b) => '    ' + b)];
      raport.push(...linie);
      console.log(linie.join('\n'));
    }
  }

  await przegladarka.close();
  if (s) s.close();
  const koniec = problemy ? `Problemy: ${problemy}` : 'Bez problemow.';
  raport.push('', koniec);
  fs.writeFileSync(path.join(WYNIK, 'raport.txt'), raport.join('\n') + '\n');
  console.log('\n' + koniec);
  process.exit(problemy ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
