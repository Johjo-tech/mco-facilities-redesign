#!/usr/bin/env node
// Construction des pages Vibe.IA d'un site statique (contrat §8). Lancé par Vercel à chaque déploiement :
//   « buildCommand »: "node vibeia/build.mjs"
// Lit l'API de la plateforme avec la clé du site (variables VIBEIA_API_URL, VIBEIA_SITE_KEY, NEXT_PUBLIC_SITE_URL ou SITE_URL)
// et écrit : blog/, realisations/, livre-blanc/, sitemap-vibeia.xml, puis remplit les blocs <!-- vibeia:… --> des pages listées
// et de llms.txt / llms-full.txt.
// La plateforme relance un déploiement (deploy hook) à chaque publication : le site reste à jour sans intervention.
// Aucune dépendance. API injoignable ou en erreur : la construction échoue, l'hébergeur garde la version en ligne
// (sinon le blog serait vidé). Site pas encore relié (VIBEIA_API_URL ou VIBEIA_SITE_KEY absente) : pages vides « bientôt ».
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PER_PAGE = 50; // plafond de l'API
const HINT = " (vérifiez VIBEIA_API_URL, qui doit se terminer par /api/v1)";

/** Erreur de l'API pendant la construction : le déploiement doit échouer pour garder la version en ligne. */
export class VibeiaApiError extends Error {}

export async function build({ apiUrl, siteKey, siteUrl, root, fetchImpl = fetch, log = console.log, offline = false, timeoutMs = 20_000 }) {
  const api = (apiUrl ?? "").replace(/\/$/, "");
  const site = siteUrl.replace(/\/$/, "");
  // Le repli sur 404 ne vaut que pour une fiche retirée entre deux appels : sur /business et les listes, une 404 (ou du HTML)
  // signale une mauvaise adresse d'API, qui viderait le blog.
  const get = async (path, fallback, { allow404 = false } = {}) => {
    if (offline) return fallback;
    let res, text;
    try {
      res = await fetchImpl(`${api}${path}`, { headers: { authorization: `Bearer ${siteKey}` }, signal: AbortSignal.timeout(timeoutMs) });
      text = await res.text();
    } catch (e) {
      throw new VibeiaApiError(`Vibe.IA ${path} injoignable : ${e?.name === "TimeoutError" ? `pas de réponse en ${timeoutMs / 1000} s` : e.message ?? e}`);
    }
    if (res.status === 404 && allow404) return fallback;
    if (!res.ok) throw new VibeiaApiError(`Vibe.IA ${path} : réponse ${res.status}${res.status === 401 ? " (clé du site refusée)" : res.status === 404 ? HINT : ""}`);
    try {
      return JSON.parse(text);
    } catch {
      throw new VibeiaApiError(`Vibe.IA ${path} : réponse non JSON${HINT}`);
    }
  };
  // Listes paginées jusqu'à « total », dédoublonnées par slug (publication pendant la lecture), bornées à 200 pages.
  const list = async (path, key) => {
    const out = [], seen = new Set();
    for (let page = 1; page <= 200; page++) {
      const r = await get(`${path}?per_page=${PER_PAGE}&page=${page}`, { [key]: [], total: 0 });
      if (!Array.isArray(r?.[key])) throw new VibeiaApiError(`Vibe.IA ${path} : réponse inattendue${HINT}`);
      let added = 0;
      for (const it of r[key]) if (it?.slug && !seen.has(it.slug)) { seen.add(it.slug); out.push(it); added++; }
      if (!added || out.length >= (Number(r.total) || 0)) break;
    }
    return out;
  };
  const config = JSON.parse(await readFile(join(root, "vibeia/config.json"), "utf8").catch(() => "{}"));
  const layout = await readFile(join(root, config.layout ?? "vibeia/layout.html"), "utf8");

  // Toutes les lectures avant la première écriture : une erreur de l'API ne laisse aucune page à moitié construite.
  const business = await get("/business", null);
  const [allPosts, allRealisations, whitepapers] = await Promise.all([list("/posts", "posts"), list("/realisations", "realisations"), get("/whitepapers", [])]);
  if (!Array.isArray(whitepapers)) throw new VibeiaApiError(`Vibe.IA /whitepapers : réponse inattendue${HINT}`);
  const postDetails = [], realisationDetails = [];
  for (const s of allPosts) {
    const p = await get(`/posts/${encodeURIComponent(s.slug)}`, null, { allow404: true });
    if (p) postDetails.push(p);
  }
  for (const s of allRealisations) {
    const x = await get(`/realisations/${encodeURIComponent(s.slug)}`, null, { allow404: true });
    if (x) realisationDetails.push(x);
  }
  // Une fiche retirée pendant la construction ne doit pas rester listée (lien mort).
  const keep = (items, details) => { const ok = new Set(details.map((d) => d.slug)); return items.filter((s) => ok.has(s.slug)); };
  const posts = keep(allPosts, postDetails), realisations = keep(allRealisations, realisationDetails);

  const name = business?.name || config.name || "";
  const withName = (base) => (name && `${base} | ${name}`.length <= 60 ? `${base} | ${name}` : base);
  const opts = { organizationId: config.organizationId || undefined };
  const absolute = (u) => (u && /^\/(?![/\\])/.test(u) ? `${site}${u}` : u || "");
  const inLayout = (o) => R.page(layout, { ...o, ogImage: absolute(o.ogImage || config.ogImage) });
  const noindex = '<meta name="robots" content="noindex, follow">'; // liste vide : page mince, hors index
  const write = async (rel, html) => {
    const file = join(root, rel);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
  };
  const entries = [];

  await write("blog/index.html", inLayout({
    title: config.blog?.title || withName("Blog : conseils, guides et actualités"),
    description: config.blog?.description || R.clip(`Conseils pratiques, guides et actualités${name ? ` de ${name}` : ""} : retrouvez nos articles pour mieux comprendre nos métiers et bien préparer vos projets.`, 158),
    canonical: `${site}/blog/`, head: posts.length ? "" : noindex, content: R.postsList(posts, { emptyLink: config.blog?.emptyLink }),
  }));
  if (posts.length) entries.push({ path: "/blog/", lastModified: posts[0].updatedAt });
  for (const p of postDetails) {
    const r = R.post(p, business, site, opts);
    await write(`blog/${p.slug}/index.html`, inLayout({ title: p.seo?.title || p.title, description: p.seo?.description || R.clip(p.summary, 158) || p.title, canonical: `${site}/blog/${p.slug}/`, ...r }));
    entries.push({ path: `/blog/${p.slug}/`, lastModified: p.updatedAt });
  }

  await write("realisations/index.html", inLayout({
    title: config.realisations?.title || withName("Nos réalisations et chantiers récents"),
    description: config.realisations?.description || R.clip(`Découvrez ${name ? `les chantiers réalisés par ${name}` : "nos chantiers récents"} en photos : le contexte de chaque projet, les travaux effectués et les résultats obtenus.`, 158),
    canonical: `${site}/realisations/`, head: realisations.length ? "" : noindex, content: R.realisationsList(realisations, { emptyLink: config.realisations?.emptyLink }),
  }));
  if (realisations.length) entries.push({ path: "/realisations/", lastModified: realisations[0].updatedAt });
  for (const x of realisationDetails) {
    const r = R.realisation(x, business, site, opts);
    await write(`realisations/${x.slug}/index.html`, inLayout({ title: x.seo?.title || x.title, description: x.seo?.description || R.clip(x.summary, 158) || x.title, canonical: `${site}/realisations/${x.slug}/`, ...r }));
    entries.push({ path: `/realisations/${x.slug}/`, lastModified: x.updatedAt });
  }

  for (const w of whitepapers) {
    await write(`livre-blanc/${w.slug}/index.html`, inLayout({ title: R.clip(w.title, 60), description: R.clip(w.summary || w.subtitle || w.title, 158), canonical: `${site}/livre-blanc/${w.slug}/`, ...R.whitepaper(w, business, site, opts) }));
    entries.push({ path: `/livre-blanc/${w.slug}/`, lastModified: w.updatedAt });
  }

  await write("sitemap-vibeia.xml", R.sitemap(site, entries));
  const values = R.blocks({ posts, realisations, whitepapers });
  for (const rel of config.inject ?? ["index.html"]) {
    const file = join(root, rel);
    const html = await readFile(file, "utf8").catch(() => null);
    if (html !== null) await writeFile(file, R.injectBlocks(html, values));
  }
  // llms.txt / llms-full.txt écrits à la main : seul le contenu entre les marqueurs est remplacé (marqueur absent : fichier inchangé).
  const llms = { llms: R.llmsIndex({ posts, realisations }, site), "llms-full": R.llmsFull(postDetails, site) };
  const llmsValues = Object.fromEntries(Object.entries(llms).map(([k, v]) => [k, v ? `\n${v}\n` : "\n"]));
  for (const rel of Array.isArray(config.llms) ? config.llms : ["llms.txt", "llms-full.txt"]) {
    const file = join(root, rel);
    const text = await readFile(file, "utf8").catch(() => null);
    if (text !== null) await writeFile(file, R.injectBlocks(text, llmsValues));
  }
  log(`✓ Vibe.IA : ${posts.length} article(s), ${realisations.length} réalisation(s), ${whitepapers.length} livre(s) blanc(s)`);
  return { posts: posts.length, realisations: realisations.length, whitepapers: whitepapers.length, pages: entries.length };
}

// Chemins réels : lancé par un lien symbolique (macOS /tmp, dossier lié), la comparaison brute échouait sans rien dire.
const isMain = (() => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  const apiUrl = process.env.VIBEIA_API_URL, siteKey = process.env.VIBEIA_SITE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (!siteUrl) {
    console.error("✗ Vibe.IA : adresse du site inconnue (SITE_URL).");
    process.exit(1);
  }
  const offline = !apiUrl || !siteKey;
  if (offline) console.log("⚠ Vibe.IA : VIBEIA_API_URL ou VIBEIA_SITE_KEY absente : pages Vibe.IA vides (« bientôt »).");
  try {
    await build({ apiUrl, siteKey, siteUrl, root: resolve(here, ".."), offline });
  } catch (e) {
    console.error(`✗ ${e.message ?? e}\n  Construction arrêtée : la version en ligne du site reste en place.`);
    process.exit(1);
  }
}
