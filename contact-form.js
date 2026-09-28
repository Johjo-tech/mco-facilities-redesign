/* Contact form → Web3Forms (shared by /contact/ and /en/contact/).
   Kept in its own file so the Content-Security-Policy can forbid inline scripts. */
(function () {
  var form = document.getElementById('mco-contact-form');
  if (!form) return;

  var en = (document.documentElement.lang || '').slice(0, 2) === 'en';
  var t = en ? {
    fallback: 'Submit my request',
    sending: 'Sending...',
    sent: 'Message sent ✓',
    ok: 'Thank you, your request has been successfully sent. Response within 24 business hours.',
    fail: function (m) { return 'An error occurred: ' + (m || 'unable to send') + '. Please try again or email us directly.'; },
    network: 'Network error. Please try again or write to us at alexandre.angulo@mco-facilities.fr.'
  } : {
    fallback: 'Envoyer ma demande',
    sending: 'Envoi en cours…',
    sent: 'Message envoyé ✓',
    ok: 'Merci, votre demande a bien été envoyée. Réponse sous 24h ouvrées.',
    fail: function (m) { return 'Une erreur est survenue : ' + (m || 'envoi impossible') + '. Réessayez ou écrivez-nous directement.'; },
    network: 'Erreur réseau. Réessayez ou écrivez-nous à alexandre.angulo@mco-facilities.fr.'
  };

  var statusEl = document.getElementById('contact-status');
  var btn = form.querySelector('button[type="submit"]');
  var btnLabel = btn ? btn.querySelector('span') : null;
  var defaultLabel = btnLabel ? btnLabel.textContent : t.fallback;

  var fail = function (msg) {
    if (btn) btn.removeAttribute('disabled');
    if (btnLabel) btnLabel.textContent = defaultLabel;
    if (statusEl) { statusEl.style.color = '#f87272'; statusEl.textContent = msg; }
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn) btn.setAttribute('disabled', '');
    if (btnLabel) btnLabel.textContent = t.sending;
    if (statusEl) { statusEl.style.color = ''; statusEl.textContent = ''; }

    var payload = Object.fromEntries(new FormData(form).entries());

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          if (btnLabel) btnLabel.textContent = t.sent;
          if (statusEl) { statusEl.style.color = '#36d399'; statusEl.textContent = t.ok; }
          form.reset();
        } else {
          fail(t.fail(data.message));
        }
      })
      .catch(function () { fail(t.network); });
  });
})();
