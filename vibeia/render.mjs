// Rendu HTML des contenus Vibe.IA pour un site statique (contrat §8). Pur, sans dépendance, testé.
// Classes préfixées « vibeia- » : le site les habille avec sa propre feuille de style.

const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);
const attr = esc;
const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "");
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const img = (p, lazy = true) => (p ? `<img src="${attr(p.url)}" alt="${attr(p.alt)}"${p.width ? ` width="${p.width}"` : ""}${p.height ? ` height="${p.height}"` : ""}${lazy ? ' loading="lazy"' : ""}>` : "");

/** Coupe un texte à `max` caractères au dernier espace, avec « … » (balises title et description). */
export function clip(s, max) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const i = cut.lastIndexOf(" ");
  return `${(i > max / 2 ? cut.slice(0, i) : cut).replace(/[\s,;:.!?–—-]+$/, "")}…`;
}

/** Lien venu de l'API (texte écrit par l'IA) : seulement http(s):// ou un chemin du site (/…), jamais javascript: ni data:. */
export function safeUrl(u) {
  const s = String(u ?? "").trim();
  return /^https?:\/\/\S/i.test(s) || /^\/(?![/\\])/.test(s) ? s : null;
}

/** Entreprise dans le JSON-LD, reliée à celle de l'accueil par « @id » (config.organizationId) pour consolider l'entité. */
const org = (business, siteUrl, organizationId) => (business || organizationId
  ? { "@type": "Organization", ...(organizationId ? { "@id": organizationId } : {}), ...(business?.name ? { name: business.name } : {}), url: business?.url || `${siteUrl}/`, ...(business?.logo ? { logo: business.logo } : {}) }
  : undefined);

const breadcrumb = (siteUrl, items) => jsonLd({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [["Accueil", "/"], ...items].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${siteUrl}${path}` })) });

/** Insère une page dans la mise en page du site (vibeia/layout.html) : {{title}} {{description}} {{canonical}} {{ogType}} {{ogImage}} {{head}} {{content}}. */
export function page(layout, { title, description, canonical, ogType = "website", ogImage = "", head = "", content }) {
  const values = { title: esc(title), description: esc(description), canonical: esc(canonical), ogType: esc(ogType), ogImage: esc(ogImage), head, content };
  return layout.replace(/\{\{(title|description|canonical|ogType|ogImage|head|content)\}\}/g, (_, k) => values[k])
    .replace(/[ \t]*<meta\s+property="og:image"\s+content=""\s*\/?>\n?/g, ""); // pas d'image : pas de balise vide
}

// Dans les cartes, l'image est décorative (alt="") : le titre nomme déjà le lien. Les 2 premières ne sont pas différées (LCP).
/** Lien facultatif sous le message d'une liste vide (config `blog.emptyLink` / `realisations.emptyLink` : { href, label }). */
const emptyLink = (l) => { const href = l && safeUrl(l.href); return href && l.label ? ` <a href="${attr(href)}">${esc(l.label)}</a>` : ""; };

export function postsList(posts, { emptyLink: link } = {}) {
  if (!posts.length) return `<section class="vibeia-list"><h1>Blog</h1><p>Les premiers articles arrivent bientôt.${emptyLink(link)}</p></section>`;
  return `<section class="vibeia-list"><h1>Blog</h1><ul class="vibeia-cards">${posts.map((p, i) => `
<li class="vibeia-card"><a href="/blog/${attr(p.slug)}/">${p.imageUrl ? img({ url: p.imageUrl, alt: "" }, i >= 2) : ""}<h2>${esc(p.title)}</h2></a>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}<p class="vibeia-date">${esc(date(p.publishedAt))}</p></li>`).join("")}
</ul></section>`;
}

/** Liens d'une section : une ligne « libellé | url | description » par lien ; les URL non sûres sont écartées. */
function sectionLinks(text) {
  const items = String(text ?? "").split("\n").map((l) => l.split("|").map((x) => x.trim()))
    .map(([label, url, ...rest]) => ({ label, url: safeUrl(url), description: rest.filter(Boolean).join(" | ") })).filter((l) => l.url);
  return items.length ? `<ul class="vibeia-links">${items.map((l) => `<li><a href="${attr(l.url)}">${esc(l.label || l.url)}</a>${l.description ? ` — ${esc(l.description)}` : ""}</li>`).join("")}</ul>` : "";
}

export function post(p, business, siteUrl, { organizationId } = {}) {
  const url = `${siteUrl}/blog/${p.slug}/`;
  const faq = (p.faq ?? []).filter((f) => f?.question && f?.answer);
  const sources = (p.sources ?? []).filter((s) => s?.label || s?.url);
  const author = p.author?.name ? p.author : null;
  const sections = (p.sections ?? []).map((s) => {
    const cta = safeUrl(s.cta?.href);
    return `
<section><h2>${esc(s.title)}</h2>${String(s.paragraphs ?? "").split(/\n{2,}/).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("")}${s.bullets ? `<ul>${String(s.bullets).split("\n").filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}${sectionLinks(s.links)}${cta ? `<p><a class="vibeia-cta" href="${attr(cta)}">${esc(s.cta.label || "Nous contacter")}</a></p>` : ""}</section>`;
  }).join("");
  const faqHtml = faq.length ? `
<section class="vibeia-faq"><h2>Questions fréquentes</h2>${faq.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join("")}</section>` : "";
  const sourcesHtml = sources.length ? `
<section class="vibeia-sources"><h2>Sources</h2><ul>${sources.map((s) => {
    const u = safeUrl(s.url);
    return `<li>${u ? `<a href="${attr(u)}" rel="nofollow noopener">${esc(s.label || u)}</a>` : esc(s.label)}</li>`;
  }).join("")}</ul></section>` : "";
  const publisher = org(business, siteUrl, organizationId);
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.seo?.description || p.summary || undefined, image: p.imageUrl ? [p.imageUrl] : undefined,
    datePublished: p.publishedAt, dateModified: p.updatedAt, url, mainEntityOfPage: url,
    author: author ? { "@type": "Person", name: author.name, ...(author.role ? { jobTitle: author.role } : {}) } : publisher, publisher };
  const head = jsonLd(ld) + breadcrumb(siteUrl, [["Blog", "/blog/"], [p.title, `/blog/${p.slug}/`]])
    + (faq.length ? jsonLd({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }) : "");
  const cover = p.imageUrl ? `<p class="vibeia-cover"><img src="${attr(p.imageUrl)}" alt="${attr(p.imageAlt)}" width="1200" height="630" style="max-width:100%;height:auto"></p>` : "";
  return { head, ogType: "article", ogImage: p.imageUrl || undefined, content: `<article class="vibeia-article"><p><a href="/blog/">← Tous les articles</a></p><h1>${esc(p.title)}</h1>${author ? `<p class="vibeia-author">Par ${esc(author.name)}${author.role ? `, ${esc(author.role)}` : ""}</p>` : ""}${cover}${p.summary ? `<p class="vibeia-lead">${esc(p.summary)}</p>` : ""}${sections}${faqHtml}${sourcesHtml}<p class="vibeia-date">Mis à jour le ${esc(date(p.updatedAt))}</p></article>` };
}

export function realisationsList(items, { emptyLink: link } = {}) {
  if (!items.length) return `<section class="vibeia-list"><h1>Nos réalisations</h1><p>Nos derniers chantiers arrivent bientôt.${emptyLink(link)}</p></section>`;
  return `<section class="vibeia-list"><h1>Nos réalisations</h1><ul class="vibeia-cards">${items.map((r, i) => `
<li class="vibeia-card"><a href="/realisations/${attr(r.slug)}/">${img(r.cover && { ...r.cover, alt: "" }, i >= 2)}<h2>${esc(r.title)}</h2></a>${r.summary ? `<p>${esc(r.summary)}</p>` : ""}</li>`).join("")}
</ul></section>`;
}

export function realisation(r, business, siteUrl, { organizationId } = {}) {
  const photos = r.photos ?? [], paragraphs = r.paragraphs ?? [], highlights = r.highlights ?? [];
  const meta = [r.service, r.city, r.date && new Date(r.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })].filter(Boolean).map(esc).join(" · ");
  const ld = { "@context": "https://schema.org", "@type": "CreativeWork", name: r.title, description: r.summary || undefined, url: `${siteUrl}/realisations/${r.slug}/`, image: photos.map((p) => p.url),
    datePublished: r.publishedAt, dateModified: r.updatedAt, ...(r.city ? { locationCreated: { "@type": "Place", name: r.city } } : {}), creator: org(business, siteUrl, organizationId) };
  return { head: jsonLd(ld) + breadcrumb(siteUrl, [["Nos réalisations", "/realisations/"], [r.title, `/realisations/${r.slug}/`]]), ogType: "article", ogImage: r.cover?.url || photos[0]?.url,
    content: `<article class="vibeia-article"><p><a href="/realisations/">← Toutes nos réalisations</a></p><h1>${esc(r.title)}</h1>${meta ? `<p class="vibeia-meta">${meta}</p>` : ""}
${paragraphs.map((t) => `<p>${esc(t)}</p>`).join("")}${highlights.length ? `<ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
${photos.length ? `<div class="vibeia-gallery">${photos.map((p, i) => img(p, i > 0)).join("")}</div>` : ""}
<p><a class="vibeia-cta" href="/contact/">Un projet similaire ? Contactez-nous</a></p></article>` };
}

// method="post" : sans JavaScript, les coordonnées ne passent jamais dans l'adresse de la page.
export function whitepaper(w, business = null, siteUrl = "", { organizationId } = {}) {
  const sections = w.sections ?? [];
  const ld = { "@context": "https://schema.org", "@type": "DigitalDocument", name: w.title, description: w.summary || w.subtitle || undefined, url: `${siteUrl}/livre-blanc/${w.slug}/`, inLanguage: "fr",
    isAccessibleForFree: true, datePublished: w.publishedAt, dateModified: w.updatedAt, publisher: org(business, siteUrl, organizationId) };
  return { head: jsonLd(ld), content: `<article class="vibeia-article vibeia-whitepaper"><p class="vibeia-meta">Livre blanc gratuit${w.pages ? ` · ${w.pages} pages` : ""}</p><h1>${esc(w.title)}</h1>${w.subtitle ? `<p class="vibeia-lead">${esc(w.subtitle)}</p>` : ""}${w.summary ? `<p>${esc(w.summary)}</p>` : ""}
${sections.length ? `<h2>Au sommaire</h2><ol>${sections.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
<h2>Recevoir le livre blanc</h2>
<form class="vibeia-form" method="post" data-vibeia="whitepaper" data-slug="${attr(w.slug)}" novalidate>
<label>Nom<input name="name" required autocomplete="name"></label>
<label>Email<input name="email" type="email" required autocomplete="email"></label>
<label>Téléphone (facultatif)<input name="phone" type="tel" autocomplete="tel"></label>
<label>Entreprise (facultatif)<input name="company" autocomplete="organization"></label>
<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
<label class="vibeia-consent"><input type="checkbox" name="consent" required> J'accepte que mes coordonnées soient utilisées pour m'envoyer ce guide et me recontacter.</label>
<button type="submit">Recevoir le livre blanc</button>
<p class="vibeia-status" role="status" aria-live="polite"></p>
</form><script src="/vibeia/form.js" defer></script></article>` };
}

/** Blocs à insérer dans les pages existantes du site, entre <!-- vibeia:NOM --> et <!-- /vibeia:NOM -->. */
export function blocks({ posts, realisations, whitepapers }) {
  return {
    "derniers-articles": posts.length ? `<ul class="vibeia-cards">${posts.slice(0, 3).map((p) => `<li class="vibeia-card"><a href="/blog/${attr(p.slug)}/"><h3>${esc(p.title)}</h3></a><p>${esc(p.summary)}</p></li>`).join("")}</ul>` : "",
    "dernieres-realisations": realisations.length ? `<ul class="vibeia-cards">${realisations.slice(0, 3).map((r) => `<li class="vibeia-card"><a href="/realisations/${attr(r.slug)}/">${img(r.cover && { ...r.cover, alt: "" })}<h3>${esc(r.title)}</h3></a></li>`).join("")}</ul>` : "",
    "livre-blanc": whitepapers[0] ? `<div class="vibeia-whitepaper-teaser"><h3>${esc(whitepapers[0].title)}</h3><p>${esc(whitepapers[0].summary)}</p><a class="vibeia-cta" href="/livre-blanc/${attr(whitepapers[0].slug)}/">Recevoir le guide gratuit</a></div>` : "",
  };
}

export function injectBlocks(html, values) {
  return html.replace(/(<!--\s*vibeia:([a-z-]+)\s*-->)[\s\S]*?(<!--\s*\/vibeia:\2\s*-->)/g, (m, open, name, close) => (name in values ? `${open}${values[name]}${close}` : m));
}

/** Sitemap des pages générées ; jamais vide (un <urlset> sans <url> est invalide) : au moins l'accueil. */
export function sitemap(siteUrl, entries) {
  const list = entries.length ? entries : [{ path: "/" }];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((e) => `  <url><loc>${esc(siteUrl + e.path)}</loc>${e.lastModified ? `<lastmod>${esc(e.lastModified.slice(0, 10))}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
}

/* ---------- llms.txt et llms-full.txt (Markdown, sur le modèle de packages/sdk/src/seo.ts) ---------- */

const mdText = (s) => { // un marqueur dans le texte casserait le remplacement rejouable (boucle : « <!<!---- » se reformerait)
  let t = String(s ?? ""), prev;
  do { prev = t; t = t.replace(/<!--|-->/g, ""); } while (t !== prev);
  return t.trim();
};
const mdLine = (s) => mdText(s).replace(/\s+/g, " ");
const mdLink = (title, url) => `[${mdLine(title).replace(/[[\]]/g, "\\$&")}](${url})`;

/** llms.txt : listes « ## Articles » et « ## Réalisations » (liens absolus et résumé), entre <!-- vibeia:llms --> et <!-- /vibeia:llms -->. */
export function llmsIndex({ posts, realisations }, siteUrl) {
  const list = (title, items, base) => (items.length
    ? [`## ${title}`, "", ...items.map((x) => `- ${mdLink(x.title, `${siteUrl}${base}${x.slug}/`)}${x.summary ? `: ${mdLine(x.summary)}` : ""}`)].join("\n") : "");
  return [list("Articles", posts, "/blog/"), list("Réalisations", realisations, "/realisations/")].filter(Boolean).join("\n\n");
}

/** Article complet en Markdown (titre, adresse, résumé, sections, FAQ), pour llms-full.txt. */
export function postToMarkdown(p, siteUrl) {
  const out = [`# ${mdLine(p.title)}`, "", `${siteUrl}/blog/${p.slug}/`, ""];
  if (p.summary) out.push(mdText(p.summary), "");
  for (const s of p.sections ?? []) {
    out.push(`## ${mdLine(s.title)}`, "");
    if (s.paragraphs) out.push(mdText(s.paragraphs), "");
    const bullets = String(s.bullets ?? "").split("\n").map(mdLine).filter(Boolean);
    if (bullets.length) out.push(...bullets.map((b) => `- ${b}`), "");
  }
  const faq = (p.faq ?? []).filter((f) => f?.question && f?.answer);
  if (faq.length) out.push("## Questions fréquentes", "", ...faq.flatMap((f) => [`**${mdLine(f.question)}**`, mdText(f.answer), ""]));
  if (p.updatedAt) out.push(`Mis à jour le ${String(p.updatedAt).slice(0, 10)}`);
  return out.join("\n").trim();
}

/** llms-full.txt : chaque article en Markdown, entre <!-- vibeia:llms-full --> et <!-- /vibeia:llms-full -->. */
export const llmsFull = (posts, siteUrl) => posts.map((p) => postToMarkdown(p, siteUrl)).join("\n\n");
