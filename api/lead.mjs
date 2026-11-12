// Fonction serveur Vercel : relais des formulaires de contact vers la plateforme Vibe.IA (contrat §3).
// La clé du site (VIBEIA_SITE_KEY) reste côté serveur. JSON uniquement : un formulaire HTML posté depuis un autre site est refusé (415).
// Champs nettoyés et coupés aux limites de la plateforme : seuls un nom ou un email vraiment invalides donnent une erreur 400.
import { createHash } from "node:crypto";

const text = (v, max = Infinity) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const isJson = (req) => String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase() === "application/json";
// Visiteur anonyme (contrat 1.5) : empreinte de l'adresse IP salée par la clé du site et le jour, jamais l'IP elle-même.
// La plateforme limite les envois par visiteur, avant la limite par site (contrat 1.6).
const visitorOf = (req) => {
  const ip = text(req.headers["x-real-ip"]) ?? text(String(req.headers["x-forwarded-for"] ?? "").split(",")[0]) ?? text(req.socket?.remoteAddress);
  return ip ? createHash("sha256").update(`${process.env.VIBEIA_SITE_KEY}:${new Date().toISOString().slice(0, 10)}:${ip}`).digest("hex").slice(0, 32) : undefined;
};
// Localisation du visiteur (contrat 1.6) : en-têtes posés par Vercel sur la requête du navigateur (ville encodée).
// Lue ici car la plateforme, appelée par ce serveur, ne voit que la localisation de la fonction Vercel.
const geoOf = (req) => {
  const country = text(req.headers["x-vercel-ip-country"]);
  let city;
  try { city = text(decodeURIComponent(req.headers["x-vercel-ip-city"] ?? ""), 100); } catch { city = undefined; } // encodage invalide : ignorée
  return { visitorCountry: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : undefined, visitorCity: city };
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  if (!process.env.VIBEIA_API_URL || !process.env.VIBEIA_SITE_KEY) return res.status(503).json({ error: "Formulaire non configuré" });
  if (!isJson(req)) return res.status(415).json({ error: "Format non pris en charge (JSON attendu)" });
  const b = req.body && typeof req.body === "object" ? req.body : {};
  if (b.website || b.botcheck) return res.status(200).json({ ok: true }); // robot : ignoré
  const role = text(b.role), message = text(b.message);
  try {
    const r = await fetch(`${process.env.VIBEIA_API_URL}/leads`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.VIBEIA_SITE_KEY}` },
      body: JSON.stringify({
        name: text(b.name), email: text(b.email), phone: text(b.phone, 40), company: text(b.company, 160),
        objective: text(b.objective, 120) ?? text(b.subject, 120), message: [role && `Fonction : ${role}`, message].filter(Boolean).join("\n\n").slice(0, 5000) || undefined,
        consent: b.consent === true || b.consent === "on", sourcePage: text(b.sourcePage, 300), utmSource: text(b.utmSource, 200), utmCampaign: text(b.utmCampaign, 200),
        userAgent: text(req.headers["user-agent"], 400), visitor: visitorOf(req), ...geoOf(req),
      }),
      signal: AbortSignal.timeout(10_000), // plateforme bloquée : 502 vite, le site bascule sur son service de secours
    });
    const data = (await r.json().catch(() => null)) ?? {};
    return res.status(r.ok ? 200 : r.status).json(r.ok ? { ok: true } : { error: data.error || "Envoi impossible" });
  } catch {
    return res.status(502).json({ error: "Service momentanément indisponible" });
  }
}
