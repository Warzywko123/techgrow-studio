'use strict';

/**
 * Endpoint asystenta czatu (POST /api/czat).
 *
 * Odpowiada na pytania o oferte, ceny i wspolprace na podstawie api/_czat-wiedza.js,
 * przez API Claude (Anthropic). Tresc rozmowy NIE jest zapisywana ani logowana —
 * historia zyje w przegladarce, do zamkniecia karty.
 *
 * Zmienne srodowiskowe (Vercel → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY — klucz z platform.claude.com. Bez niego endpoint zwraca blad.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('./_czat-wiedza');

const MODEL = 'claude-haiku-5-5';
const MAKS_WIADOMOSCI = 12; // ile ostatnich wiadomosci z historii trafia do modelu
const MAKS_ZNAKOW = 800; // dlugosc jednej wiadomosci

const AWARIA =
  'Przepraszam, asystent jest chwilowo niedostępny. Zadzwoń pod 730 393 493 albo napisz przez formularz na stronie /kontakt.html.';

// Limit wiadomosci z jednego adresu IP. Jak w formularzu: pamiec funkcji
// serverless nie jest niezawodna, wiec to sito, a twardym bezpiecznikiem
// kosztow jest limit wydatkow ustawiony w konsoli Anthropic.
const OKNO_MS = 60 * 60 * 1000;
const LIMIT_W_OKNIE = 30;
const historiaIP = new Map();

function limitPrzekroczony(ip) {
  const teraz = Date.now();
  const czasy = (historiaIP.get(ip) || []).filter((t) => teraz - t < OKNO_MS);
  if (czasy.length >= LIMIT_W_OKNIE) {
    historiaIP.set(ip, czasy);
    return true;
  }
  czasy.push(teraz);
  historiaIP.set(ip, czasy);
  if (historiaIP.size > 500) {
    for (const [klucz, wpisy] of historiaIP) {
      if (!wpisy.some((t) => teraz - t < OKNO_MS)) historiaIP.delete(klucz);
    }
  }
  return false;
}

/** Zaufany adres klienta: x-real-ip ustawia Vercel i klient go nie podmieni.
    Pierwszy wpis X-Forwarded-For pochodzi od klienta, wiec go nie uzywamy. */
function adresIP(req) {
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  const lista = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return lista.length ? lista[lista.length - 1] : 'nieznany';
}

/** Historia z przegladarki: [{ role: 'user'|'assistant', text }]. Przyjmujemy tylko
    zwykly tekst, naprzemiennie, zaczynajac i konczac na wiadomosci uzytkownika. */
function oczyscHistorie(surowa) {
  if (!Array.isArray(surowa)) return null;
  const wiadomosci = surowa
    .slice(-MAKS_WIADOMOSCI)
    .map((w) => ({
      role: w && w.role === 'assistant' ? 'assistant' : 'user',
      content: String((w && w.text) || '')
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
        .trim()
        .slice(0, MAKS_ZNAKOW),
    }))
    .filter((w) => w.content);
  while (wiadomosci.length && wiadomosci[0].role !== 'user') wiadomosci.shift();
  if (!wiadomosci.length || wiadomosci[wiadomosci.length - 1].role !== 'user') return null;
  for (let i = 1; i < wiadomosci.length; i++) {
    if (wiadomosci[i].role === wiadomosci[i - 1].role) return null;
  }
  return wiadomosci;
}

let klient;
function anthropic() {
  if (!klient) klient = new Anthropic();
  return klient;
}

function odpowiedz(res, kod, tresc) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(kod).json(tresc);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return odpowiedz(res, 405, { blad: 'Nieobsługiwana metoda.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Brak zmiennej ANTHROPIC_API_KEY — czat nie ma jak odpowiedziec.');
    return odpowiedz(res, 503, { blad: AWARIA });
  }

  let dane = req.body;
  if (typeof dane === 'string') {
    try {
      dane = JSON.parse(dane);
    } catch (e) {
      dane = null;
    }
  }
  const wiadomosci = oczyscHistorie(dane && dane.messages);
  if (!wiadomosci) return odpowiedz(res, 400, { blad: 'Nieprawidłowa wiadomość.' });

  if (limitPrzekroczony(adresIP(req))) {
    return odpowiedz(res, 429, {
      blad: 'Z tego urządzenia poszło już dużo wiadomości. Spróbuj później albo zadzwoń: 730 393 493.',
    });
  }

  try {
    const wynik = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2048,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: wiadomosci,
    });

    if (wynik.stop_reason === 'refusal') {
      return odpowiedz(res, 200, { odpowiedz: 'W tej sprawie nie pomogę na czacie. Zadzwoń: 730 393 493.' });
    }
    const tekst = wynik.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!tekst) return odpowiedz(res, 502, { blad: AWARIA });
    return odpowiedz(res, 200, { odpowiedz: tekst });
  } catch (e) {
    // Logujemy tylko rodzaj bledu — nigdy tresci rozmowy.
    if (e instanceof Anthropic.RateLimitError) {
      console.error('Czat: limit zapytan API (429).');
    } else if (e instanceof Anthropic.AuthenticationError) {
      console.error('Czat: zly ANTHROPIC_API_KEY.');
    } else if (e instanceof Anthropic.APIError) {
      console.error('Czat: blad API ' + e.status + '.');
    } else {
      console.error('Czat: blad ' + (e && e.name) + '.');
    }
    return odpowiedz(res, 503, { blad: AWARIA });
  }
};
