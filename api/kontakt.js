'use strict';

/**
 * Endpoint formularza kontaktowego.
 *
 * Vercel wystawia kazdy plik z katalogu /api jako funkcje serverless — strona
 * zostaje statyczna, a calym backendem jest ten jeden plik. Wysylka idzie przez
 * HTTP API Resendu zwyklym fetchem, wiec nie ma tu zadnej zaleznosci do
 * zainstalowania i node_modules na produkcji dalej nie istnieje.
 *
 * Zmienne srodowiskowe (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY — klucz z resend.com. Bez niego endpoint zwraca blad.
 *   KONTAKT_TO     — odbiorca zgloszen. Domyslnie techgrowstudio@gmail.com.
 *   KONTAKT_FROM   — nadawca. Dopoki domena nie jest zweryfikowana w Resendzie,
 *                    musi zostac onboarding@resend.dev, a odbiorca moze byc
 *                    WYLACZNIE adres wlasciciela konta Resend. Po weryfikacji
 *                    domeny mozna ustawic np. "Formularz <kontakt@techgrowstudio.pl>".
 */

const ODBIORCA = process.env.KONTAKT_TO || 'techgrowstudio@gmail.com';
const NADAWCA = process.env.KONTAKT_FROM || 'Formularz TechGrow <onboarding@resend.dev>';

const AWARIA =
  'Nie udało się wysłać wiadomości. Zadzwoń pod 730 393 493 albo napisz na techgrowstudio@gmail.com.';

const MAKS = { imie: 80, email: 120, telefon: 30, temat: 80, wiadomosc: 3000, strona: 120 };

// Formularz wypelniony w mniej niz 3 sekundy to bot, nie czlowiek.
const MIN_CZAS_MS = 3000;

// Limit zgloszen z jednego adresu IP. Funkcje serverless bywaja wygaszane
// i uruchamiane rownolegle, wiec ta pamiec nie jest niezawodna — to sito na
// najprostsze boty, nie zapora. Prawdziwy limit wymagalby zewnetrznej bazy.
const OKNO_MS = 10 * 60 * 1000;
const LIMIT_W_OKNIE = 3;
const historia = new Map();

function limitPrzekroczony(ip) {
  const teraz = Date.now();
  const czasy = (historia.get(ip) || []).filter((t) => teraz - t < OKNO_MS);
  if (czasy.length >= LIMIT_W_OKNIE) {
    historia.set(ip, czasy);
    return true;
  }
  czasy.push(teraz);
  historia.set(ip, czasy);
  if (historia.size > 500) {
    for (const [klucz, wpisy] of historia) {
      if (!wpisy.some((t) => teraz - t < OKNO_MS)) historia.delete(klucz);
    }
  }
  return false;
}

/** Przycina, ucina do limitu i wyrzuca znaki sterujace. Zostaja tylko tabulator
    i nowa linia — reszta leci, z powrotem karetki (CR) na czele, bo para CRLF
    sluzy do wstrzykiwania naglowkow w tresc maila. */
function oczysc(wartosc, limit) {
  if (typeof wartosc !== 'string') return '';
  return wartosc
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .trim()
    .slice(0, limit);
}

function poprawnyEmail(adres) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(adres);
}

function ileCyfr(tekst) {
  return tekst.replace(/\D/g, '').length;
}

/** Czy klient oczekuje JSON-a (fetch), czy zwyklej strony (formularz bez JS)? */
function chceJson(req) {
  return String(req.headers.accept || '').indexOf('application/json') !== -1;
}

function odpowiedz(req, res, kod, tresc) {
  if (chceJson(req)) return res.status(kod).json(tresc);

  // Sciezka bez JavaScriptu: przegladarka wyslala zwykly POST i oczekuje strony.
  const udalo = tresc.ok === true;
  const naglowek = udalo ? 'Wiadomość wysłana' : 'Nie udało się wysłać';
  const akapit = udalo
    ? 'Dziękuję — odezwę się na podany kontakt.'
    : String(tresc.blad || AWARIA);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(kod).send(
    '<!doctype html><html lang="pl"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex">' +
      '<title>' + naglowek + ' — TechGrow Studio</title>' +
      '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#DCE8F7;' +
      'color:#0F1B33;font:17px/1.6 system-ui,sans-serif;padding:2rem}' +
      'div{max-width:34rem;background:#fff;border-radius:1.2rem;padding:2rem}' +
      'a{color:#1D4ED8}</style></head><body><div><h1>' + naglowek + '</h1><p>' +
      akapit.replace(/[<>&]/g, '') +
      '</p><p><a href="/kontakt.html">Wróć na stronę kontaktu</a></p></div></body></html>'
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return odpowiedz(req, res, 405, { ok: false, blad: 'Nieobsługiwana metoda.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Brak zmiennej RESEND_API_KEY — formularz nie ma czym wyslac maila.');
    return odpowiedz(req, res, 500, { ok: false, blad: AWARIA });
  }

  let dane = req.body;
  if (typeof dane === 'string') {
    try {
      dane = JSON.parse(dane);
    } catch (e) {
      dane = null;
    }
  }
  if (!dane || typeof dane !== 'object') {
    return odpowiedz(req, res, 400, { ok: false, blad: 'Nie udało się odczytać formularza.' });
  }

  // Dwie pulapki na boty. Obie koncza sie udawanym sukcesem — bot nie dowiaduje
  // sie, ze zostal zlapany, i nie probuje dalej z innym zestawem danych.
  if (oczysc(dane.firma, 200) !== '') return odpowiedz(req, res, 200, { ok: true });
  const czasRenderu = Number(dane.czas);
  if (Number.isFinite(czasRenderu) && czasRenderu > 0 && Date.now() - czasRenderu < MIN_CZAS_MS) {
    return odpowiedz(req, res, 200, { ok: true });
  }

  const imie = oczysc(dane.imie, MAKS.imie);
  const email = oczysc(dane.email, MAKS.email);
  const telefon = oczysc(dane.telefon, MAKS.telefon);
  const temat = oczysc(dane.temat, MAKS.temat);
  const wiadomosc = oczysc(dane.wiadomosc, MAKS.wiadomosc);
  const strona = oczysc(dane.strona, MAKS.strona);
  const zgoda = dane.zgoda === true || dane.zgoda === 'on' || dane.zgoda === 'true';

  const bledy = [];
  if (imie.length < 2) bledy.push('Podaj imię.');
  if (!email && !telefon) bledy.push('Zostaw e-mail albo numer telefonu.');
  if (email && !poprawnyEmail(email)) bledy.push('Adres e-mail wygląda na niepoprawny.');
  if (telefon && (ileCyfr(telefon) < 9 || ileCyfr(telefon) > 15)) {
    bledy.push('Numer telefonu wygląda na niepoprawny.');
  }
  if (wiadomosc.length < 10) bledy.push('Napisz kilka słów o tym, czego potrzebujesz.');
  if (!zgoda) bledy.push('Bez zgody na kontakt nie mogę odpowiedzieć na zapytanie.');
  if (bledy.length) {
    return odpowiedz(req, res, 400, { ok: false, blad: bledy.join(' ') });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'nieznany';
  if (limitPrzekroczony(ip)) {
    return odpowiedz(req, res, 429, {
      ok: false,
      blad: 'Z tego urządzenia poszło już kilka wiadomości. Spróbuj za chwilę albo zadzwoń: 730 393 493.',
    });
  }

  const tresc = [
    'Nowe zapytanie z formularza na techgrowstudio.pl',
    '',
    'Imię:      ' + imie,
    'E-mail:    ' + (email || '—'),
    'Telefon:   ' + (telefon || '—'),
    'Temat:     ' + (temat || '—'),
    'Podstrona: ' + (strona || '—'),
    '',
    'Wiadomość:',
    wiadomosc,
    '',
    '—',
    'Zgoda na przetwarzanie danych: tak, ' + new Date().toISOString(),
  ].join('\n');

  const kontroler = new AbortController();
  const stoper = setTimeout(() => kontroler.abort(), 8000);
  try {
    const wynik = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        Object.assign(
          {
            from: NADAWCA,
            to: [ODBIORCA],
            subject: 'Zapytanie ze strony: ' + (temat || 'formularz kontaktowy'),
            text: tresc,
          },
          // reply_to tylko z adresu, ktory przeszedl walidacje — inaczej dalo by
          // sie wstrzyknac cokolwiek w naglowek maila.
          email && poprawnyEmail(email) ? { reply_to: email } : {}
        )
      ),
      signal: kontroler.signal,
    });

    if (!wynik.ok) {
      console.error('Resend odrzucil wysylke', wynik.status, await wynik.text());
      return odpowiedz(req, res, 502, { ok: false, blad: AWARIA });
    }
  } catch (e) {
    console.error('Blad wysylki przez Resend', e);
    return odpowiedz(req, res, 502, { ok: false, blad: AWARIA });
  } finally {
    clearTimeout(stoper);
  }

  return odpowiedz(req, res, 200, { ok: true });
};
