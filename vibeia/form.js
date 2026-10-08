// Formulaires Vibe.IA d'un site statique (contrat §8) : livre blanc (data-vibeia="whitepaper") et contact (data-vibeia="lead").
// Envoi vers les fonctions serveur du site (/api/livre-blanc, /api/lead) : la clé du site ne quitte jamais le serveur.
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/; // même exigence que la plateforme (extension d'au moins 2 lettres)
  function send(form, url, payload, done) {
    var status = form.querySelector(".vibeia-status");
    var button = form.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    if (status) status.textContent = "Envoi…";
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (r) {
        if (button) button.disabled = false;
        if (!r.ok) { if (status) status.textContent = (r.d && r.d.error) || "L'envoi a échoué. Réessayez dans un instant."; return; }
        done(r.d, status);
      })
      .catch(function () { if (button) button.disabled = false; if (status) status.textContent = "L'envoi a échoué. Réessayez dans un instant."; });
  }
  function fields(form) {
    var f = new FormData(form);
    var q = new URLSearchParams(location.search);
    return {
      name: String(f.get("name") || "").trim(), email: String(f.get("email") || "").trim(), phone: String(f.get("phone") || "") || undefined,
      company: String(f.get("company") || "") || undefined, message: String(f.get("message") || "") || undefined, objective: String(f.get("objective") || "") || undefined,
      website: String(f.get("website") || ""), consent: f.get("consent") ? true : false, sourcePage: location.pathname,
      utmSource: q.get("utm_source") || undefined, utmCampaign: q.get("utm_campaign") || undefined,
    };
  }
  // Champs en erreur marqués aria-invalid, focus sur le premier à corriger, message dans la zone de statut.
  function check(form, p) {
    var status = form.querySelector(".vibeia-status");
    var rules = [
      ["name", p.name.length < 2, "Indiquez votre nom (2 caractères minimum)."],
      ["email", !EMAIL.test(p.email), "Adresse email invalide."],
      ["consent", !p.consent, "Merci d'accepter l'utilisation de vos données."],
    ];
    var err = "", first = null;
    rules.forEach(function (r) {
      var el = form.querySelector('[name="' + r[0] + '"]');
      if (el) { if (r[1]) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid"); }
      if (r[1] && !err) { err = r[2]; first = el; }
    });
    if (err && status) status.textContent = err;
    if (first) first.focus();
    return !err;
  }
  document.querySelectorAll("form[data-vibeia]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var p = fields(form);
      if (!check(form, p)) return;
      if (form.dataset.vibeia === "whitepaper") {
        p.slug = form.dataset.slug;
        send(form, "/api/livre-blanc", p, function (d, status) {
          // La zone de statut (aria-live) reste en place et annonce le succès ; le focus passe sur le lien du PDF.
          Array.prototype.forEach.call(form.children, function (el) {
            if (el !== status && !(status && el.contains(status))) { el.hidden = true; el.style.display = "none"; }
          });
          if (status) status.textContent = "Merci ! Votre livre blanc est prêt.";
          var a = document.createElement("a");
          a.className = "vibeia-cta"; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("download", "");
          a.href = d.url; a.textContent = "Télécharger le livre blanc (PDF)";
          var wrap = document.createElement("p");
          wrap.appendChild(a); form.appendChild(wrap);
          a.focus();
        });
      } else {
        send(form, "/api/lead", p, function () { location.href = form.dataset.merci || "/merci/"; });
      }
    });
  });
})();
