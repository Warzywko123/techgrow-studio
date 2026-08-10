/* Obsluga formularza kontaktowego (kontakt.html i oferta.html).

   Wysyla dane JSON-em do /api/kontakt i pokazuje wynik bez przeladowania strony.
   Gdyby JavaScript nie zadzialal, formularz ma zwykle action/method i wysle sie
   klasycznym POST-em — endpoint wykrywa taki przypadek i odpowiada prosta strona.

   Zdarzenie GA4 `form_submit` leci tylko po udanej wysylce i tylko wtedy, gdy
   odwiedzajacy zgodzil sie na analitykę — bez zgody gtag.js w ogole sie nie
   wczytuje, wiec polecenie czeka w dataLayer i nigdzie nie wychodzi. */
(function () {
  'use strict';

  var AWARIA =
    'Nie udało się wysłać wiadomości. Zadzwoń pod 730 393 493 albo napisz na techgrowstudio@gmail.com.';

  var formularze = document.querySelectorAll('form[data-formularz-kontakt]');
  if (!formularze.length) return;

  Array.prototype.forEach.call(formularze, function (form) {
    var przycisk = form.querySelector('button[type="submit"]');
    var status = form.querySelector('[data-status]');
    var sukces = document.querySelector('[data-sukces]');
    var poleCzasu = form.querySelector('input[name="czas"]');
    var email = form.querySelector('input[name="email"]');
    var telefon = form.querySelector('input[name="telefon"]');
    var zgoda = form.querySelector('input[name="zgoda"]');

    // Znacznik czasu wygenerowania formularza — endpoint odrzuca zgloszenia
    // wypelnione w mniej niz 3 sekundy, bo tyle zajmuje tylko botowi.
    if (poleCzasu) poleCzasu.value = String(Date.now());

    function pokazBlad(tekst) {
      if (!status) return;
      status.textContent = tekst;
      status.hidden = !tekst;
    }

    form.addEventListener('submit', function (zdarzenie) {
      zdarzenie.preventDefault();
      if (form.getAttribute('data-wysylam') === '1') return;

      pokazBlad('');

      // „E-mail albo telefon" — samego HTML-a nie da sie tak zapisac,
      // wiec ten jeden warunek sprawdzamy tutaj (i drugi raz na serwerze).
      if (email && telefon && !email.value.trim() && !telefon.value.trim()) {
        pokazBlad('Zostaw e-mail albo numer telefonu — inaczej nie mam jak odpowiedzieć.');
        email.focus();
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var dane = {};
      var pola = new FormData(form);
      pola.forEach(function (wartosc, klucz) {
        dane[klucz] = wartosc;
      });
      dane.zgoda = !!(zgoda && zgoda.checked);
      dane.strona = location.pathname;

      var etykieta = przycisk ? przycisk.textContent : '';
      form.setAttribute('data-wysylam', '1');
      if (przycisk) {
        przycisk.disabled = true;
        przycisk.textContent = 'Wysyłam…';
      }

      fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(dane)
      })
        .then(function (odpowiedz) {
          return odpowiedz
            .json()
            .catch(function () {
              return {};
            })
            .then(function (tresc) {
              if (!odpowiedz.ok || tresc.ok !== true) {
                throw new Error(tresc.blad || AWARIA);
              }
            });
        })
        .then(function () {
          // Sam atrybut `hidden` tu nie wystarcza: formularz ma klase `grid`,
          // a `.grid { display: grid }` z warstwy narzedzi bije `[hidden]`
          // z warstwy bazowej. Bez `display: none` w stylu wlasciwym formularz
          // zostawal na ekranie pod komunikatem o wyslaniu.
          form.hidden = true;
          form.style.display = 'none';
          if (sukces) {
            sukces.hidden = false;
            sukces.focus();
            sukces.scrollIntoView({ block: 'center' });
          }
          if (typeof gtag === 'function') {
            gtag('event', 'form_submit', { page_path: location.pathname });
          }
        })
        .catch(function (blad) {
          pokazBlad(blad && blad.message ? blad.message : AWARIA);
        })
        .then(function () {
          form.setAttribute('data-wysylam', '0');
          if (przycisk) {
            przycisk.disabled = false;
            przycisk.textContent = etykieta;
          }
        });
    });
  });
})();
