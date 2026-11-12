// Fonction serveur Vercel : relais du formulaire de livre blanc vers la plateforme Vibe.IA (contrat 1.2 / §8).
// La clé du site (VIBEIA_SITE_KEY) reste côté serveur. JSON uniquement : un formulaire HTML posté depuis un autre site est refusé (415).
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
  if (!b.slug || typeof b.slug !== "string") return res.status(400).json({ error: "Livre blanc inconnu" });
  try {
    const r = await fetch(`${process.env.VIBEIA_API_URL}/whitepapers/${encodeURIComponent(b.slug)}/download`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.VIBEIA_SITE_KEY}` },
      body: JSON.stringify({
        name: text(b.name), email: text(b.email), phone: text(b.phone, 40), company: text(b.company, 160), consent: b.consent === true || b.consent === "on",
        website: text(b.website), sourcePage: text(b.sourcePage, 300), utmSource: text(b.utmSource, 200), utmMedium: text(b.utmMedium, 200), utmCampaign: text(b.utmCampaign, 200),
        userAgent: text(req.headers["user-agent"], 400), visitor: visitorOf(req), ...geoOf(req),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await r.json().catch(() => null)) ?? {}; // la plateforme répond « null » en 404
    if (r.status === 404) return res.status(404).json({ error: "Ce livre blanc n'est plus disponible." });
    return res.status(r.ok ? 200 : r.status).json(r.ok ? { ok: true, url: data.url } : { error: data.error || "Envoi impossible" });
  } catch {
    return res.status(502).json({ error: "Service momentanément indisponible" });
  }
}
