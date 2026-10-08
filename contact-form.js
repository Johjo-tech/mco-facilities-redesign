/* Contact form (shared by /contact/ and /en/contact/).
   Sent to /api/lead (server function → Vibe.IA cockpit: CRM + email notification; the site key stays on the server).
   If that relay is unavailable (not configured, platform down), falls back to Web3Forms as before.
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
    invalid: 'Some fields are invalid: please check your name (at least 2 characters), your email address and the length of your message.',
    network: 'Network error. Please try again or write to us at contact@mco-facilities.fr.'
  } : {
    fallback: 'Envoyer ma demande',
    sending: 'Envoi en cours…',
    sent: 'Message envoyé ✓',
    ok: 'Merci, votre demande a bien été envoyée. Réponse sous 24h ouvrées.',
    fail: function (m) { return 'Une erreur est survenue : ' + (m || 'envoi impossible') + '. Réessayez ou écrivez-nous directement.'; },
    invalid: 'Certains champs sont invalides : vérifiez votre nom (2 caractères minimum), votre adresse email et la longueur de votre message.',
    network: 'Erreur réseau. Réessayez ou écrivez-nous à contact@mco-facilities.fr.'
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
    payload.consent = !!payload.consent;
    payload.sourcePage = location.pathname;

    var done = function () {
      if (btnLabel) btnLabel.textContent = t.sent;
      if (statusEl) { statusEl.style.color = '#36d399'; statusEl.textContent = t.ok; }
      form.reset();
    };
    var web3forms = function () {
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) { if (data.success) done(); else fail(t.fail(data.message)); })
        .catch(function () { fail(t.network); });
    };

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (r.ok) return done();
        // 400/422 = the request itself is invalid (the browser checks already match the platform's).
        // Anything else (relay missing or not configured, key refused, rate limit, platform down): Web3Forms.
        if (r.status === 400 || r.status === 422) return fail(t.invalid);
        return web3forms();
      })
      .catch(web3forms);
  });
})();
