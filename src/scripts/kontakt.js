// Kontakt: setzt die Mail-Adresse erst im Browser zusammen (Schutz gegen einfache Sammler, siehe docs/ENTSCHEIDUNGEN.md),
// zeigt Mail- und Kopierknopf und kopiert die Adresse. Ohne dieses Skript bleibt der Rueckfalltext stehen.
// Die Adressteile und Meldungen liegen als data-Attribute in der Seite (Quelle: src/content/de.json).
(function () {
  var adresse = document.getElementById("addr");
  var mail = document.getElementById("mail");
  var kopieren = document.getElementById("copy");
  var meldung = document.getElementById("copied");
  if (!adresse || !mail || !kopieren || !meldung) return;

  var text = adresse.getAttribute("data-l") + "@" + adresse.getAttribute("data-d");
  adresse.textContent = text;
  mail.setAttribute("href", "mailto:" + text + "?subject=" + encodeURIComponent(adresse.getAttribute("data-s")));
  mail.hidden = false;
  kopieren.hidden = false;

  kopieren.addEventListener("click", function () {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
      function () { meldung.textContent = kopieren.getAttribute("data-ok"); },
      function () { meldung.textContent = kopieren.getAttribute("data-fehler"); }
    );
  });
})();
