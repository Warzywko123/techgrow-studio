/* Okienko asystenta czatu (AI) — pyta /api/czat o oferte, ceny i wspolprace.
   Rozmowa jest trzymana tylko w pamieci tej karty: po odswiezeniu znika,
   nic nie trafia do localStorage ani na serwer poza samym pytaniem. */
(function () {
  'use strict';

  var SUGESTIE = ['Ile kosztuje strona?', 'Czym różnią się pakiety?', 'Jak wygląda współpraca?', 'Ile trwa realizacja?'];
  var historia = []; // [{ role: 'user'|'assistant', text }]
  var wysylanie = false;

  function el(tag, atrybuty, dzieci) {
    var n = document.createElement(tag);
    Object.keys(atrybuty || {}).forEach(function (k) {
      if (k === 'text') n.textContent = atrybuty[k];
      else n.setAttribute(k, atrybuty[k]);
    });
    (dzieci || []).forEach(function (d) { n.appendChild(d); });
    return n;
  }

  function sledz(zdarzenie) {
    if (typeof window.gtag === 'function') window.gtag('event', zdarzenie);
  }

  // Tekst z modelu wstawiamy jako tekst (bez HTML), a linkami robimy tylko
  // znane rzeczy: telefon, e-mail i adresy podstron tej witryny.
  function wstawTekst(kontener, tekst) {
    var wzorzec = /(\/[a-z0-9-]+\.html|730 393 493|techgrowstudio@gmail\.com)/g;
    var ostatni = 0;
    var m;
    while ((m = wzorzec.exec(tekst))) {
      kontener.appendChild(document.createTextNode(tekst.slice(ostatni, m.index)));
      var t = m[0];
      var href = t.charAt(0) === '/' ? t : t.indexOf('@') > -1 ? 'mailto:' + t : 'tel:+48730393493';
      var etykieta = t === '/kontakt.html' ? 'formularz kontaktowy' : t.charAt(0) === '/' ? t.slice(1, -5) : t;
      kontener.appendChild(el('a', { href: href, text: etykieta }));
      ostatni = m.index + t.length;
    }
    kontener.appendChild(document.createTextNode(tekst.slice(ostatni)));
  }

  var przycisk = el('button', { type: 'button', class: 'czat-przycisk', 'aria-expanded': 'false', 'aria-controls': 'czat-panel' }, [
    el('span', { class: 'czat-przycisk-ikona', 'aria-hidden': 'true', text: '💬' }),
    el('span', { class: 'czat-przycisk-tekst', text: 'Zapytaj o stronę' }),
  ]);

  var lista = el('div', { class: 'czat-lista', role: 'log', 'aria-live': 'polite' });
  var pole = el('textarea', { class: 'czat-pole', rows: '1', maxlength: '800', placeholder: 'Napisz pytanie…', 'aria-label': 'Twoje pytanie' });
  var wyslij = el('button', { type: 'submit', class: 'czat-wyslij', text: 'Wyślij' });
  var formularz = el('form', { class: 'czat-formularz' }, [pole, wyslij]);
  var sugestie = el('div', { class: 'czat-sugestie' });
  var zamknij = el('button', { type: 'button', class: 'czat-zamknij', 'aria-label': 'Zamknij czat', text: '×' });

  var uwaga = el('p', { class: 'czat-uwaga' });
  uwaga.append(
    'Odpowiada asystent AI — może się pomylić. Wiążącą wycenę dostaniesz ode mnie: ',
    el('a', { href: 'tel:+48730393493', text: '730 393 493' }),
    '. Nie wpisuj tu danych osobowych. ',
    el('a', { href: '/polityka-prywatnosci.html#czat', text: 'Prywatność' }),
    '.'
  );

  var panel = el('div', { id: 'czat-panel', class: 'czat-panel', role: 'dialog', 'aria-label': 'Asystent TechGrow Studio', hidden: '' }, [
    el('div', { class: 'czat-naglowek' }, [
      el('div', {}, [
        el('strong', { text: 'Asystent TechGrow Studio' }),
        el('span', { class: 'czat-podtytul', text: 'Oferta, ceny i współpraca — odpowiadam od razu' }),
      ]),
      zamknij,
    ]),
    lista,
    sugestie,
    formularz,
    uwaga,
  ]);

  function dodajDymek(rola, tekst) {
    var d = el('div', { class: 'czat-dymek czat-' + rola });
    wstawTekst(d, tekst);
    lista.appendChild(d);
    lista.scrollTop = lista.scrollHeight;
    return d;
  }

  function otworz() {
    panel.hidden = false;
    przycisk.setAttribute('aria-expanded', 'true');
    document.body.classList.add('czat-otwarty');
    if (!lista.childElementCount) {
      dodajDymek('assistant', 'Cześć! Odpowiem na pytania o strony, ceny, pakiety i to, jak wygląda współpraca z TechGrow Studio. O co chcesz zapytać?');
      SUGESTIE.forEach(function (s) {
        var b = el('button', { type: 'button', class: 'czat-sugestia', text: s });
        b.addEventListener('click', function () { zapytaj(s); });
        sugestie.appendChild(b);
      });
      sledz('chat_open');
    }
    pole.focus();
  }

  function zamknijPanel() {
    panel.hidden = true;
    przycisk.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('czat-otwarty');
    przycisk.focus();
  }

  function zapytaj(tekst) {
    tekst = String(tekst || '').trim();
    if (!tekst || wysylanie) return;
    wysylanie = true;
    wyslij.disabled = true;
    sugestie.textContent = '';
    pole.value = '';
    dodajDymek('user', tekst);
    historia.push({ role: 'user', text: tekst });
    var pisze = dodajDymek('assistant', 'Piszę odpowiedź…');
    pisze.classList.add('czat-pisze');
    sledz('chat_message');

    fetch('/api/czat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages: historia }),
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (dane) { return { ok: r.ok, dane: dane }; });
      })
      .then(function (w) {
        pisze.remove();
        if (w.ok && w.dane.odpowiedz) {
          dodajDymek('assistant', w.dane.odpowiedz);
          historia.push({ role: 'assistant', text: w.dane.odpowiedz });
        } else {
          // Nieudane pytanie nie zostaje w historii — nastepne wysle sie poprawnie.
          historia.pop();
          dodajDymek('assistant', w.dane.blad || 'Nie udało się wysłać. Zadzwoń: 730 393 493.');
        }
      })
      .catch(function () {
        pisze.remove();
        historia.pop();
        dodajDymek('assistant', 'Brak połączenia. Spróbuj ponownie albo zadzwoń: 730 393 493.');
      })
      .then(function () {
        wysylanie = false;
        wyslij.disabled = false;
        pole.focus();
      });
  }

  przycisk.addEventListener('click', function () { panel.hidden ? otworz() : zamknijPanel(); });
  zamknij.addEventListener('click', zamknijPanel);
  formularz.addEventListener('submit', function (e) { e.preventDefault(); zapytaj(pole.value); });
  pole.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); zapytaj(pole.value); }
  });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') zamknijPanel(); });

  // Dopoki baner cookies czeka na decyzje, przycisk czatu znika — na telefonie
  // lezalby w tym samym miejscu co baner.
  var baner = document.getElementById('cookie-banner');
  function sprawdzBaner() {
    var widoczny = baner && !baner.classList.contains('opacity-0');
    document.body.classList.toggle('czat-baner-otwarty', !!widoczny);
  }
  if (baner) new MutationObserver(sprawdzBaner).observe(baner, { attributes: true, attributeFilter: ['class'] });
  sprawdzBaner();

  document.body.append(przycisk, panel);
})();
