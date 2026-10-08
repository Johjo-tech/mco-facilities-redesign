# Branchement du site MCO Facilities sur le cockpit Vibe.IA

Le site reste en HTML statique. Le blog, les réalisations et le livre blanc sont rédigés et validés dans le cockpit Vibe.IA, puis **fabriqués en pages HTML à chaque déploiement** par `vibeia/build.mjs`. Kit d'origine : `packages/static-connector` du dépôt Vibe.IA (contrat du site, §8).

## Ce qui a été ajouté
| Fichier | Rôle |
|---|---|
| `vibeia/build.mjs`, `vibeia/render.mjs` | Commande de construction Vercel : lit l'API Vibe.IA avec la clé du site et écrit `blog/`, `realisations/`, `livre-blanc/`, `sitemap-vibeia.xml`, puis remplit les blocs de l'accueil. |
| `vibeia/layout.html` | Mise en page des pages générées (en-tête, menu et pied de page du site). À tenir à jour si le menu change. |
| `vibeia/vibeia.css` | Habillage des pages générées, des blocs de l'accueil et de la case de consentement du formulaire. |
| `vibeia/form.js` | Formulaire du livre blanc. |
| `api/lead.mjs`, `api/livre-blanc.mjs` | Fonctions serveur Vercel : relais des formulaires vers le cockpit (la clé ne quitte jamais le serveur). |
| `index.html` | Section « Nos dernières réalisations / Derniers articles / Guide gratuit », remplie entre les marqueurs `<!-- vibeia:… -->`. Un bloc vide reste caché. |
| `llms.txt`, `llms-full.txt` | Listes des articles et réalisations (et articles complets) régénérées entre les marqueurs `<!-- vibeia:llms -->` et `<!-- vibeia:llms-full -->`, pour les moteurs d'IA. |
| `robots.txt` | Second sitemap (`sitemap-vibeia.xml`) et `Disallow: /api/` dans chaque groupe. |
| `contact-form.js` | Le formulaire de contact passe par `/api/lead` (contact dans le CRM, email à MCO) ; Web3Forms reste en secours si le cockpit est indisponible. Case de consentement obligatoire. |

Les dossiers `blog/`, `realisations/`, `livre-blanc/` et `sitemap-vibeia.xml` sont générés : ils sont dans `.gitignore`, ne pas les committer.

## Mise en service (projet Vercel du site)
1. **Variables** (Settings › Environment Variables, Production et Preview) : `VIBEIA_API_URL`, `VIBEIA_SITE_KEY`, `SITE_URL` (voir `.env.example`).
2. **Construction** : rien à régler, `vercel.json` porte `buildCommand` et `outputDirectory`.
3. **Reconstruction automatique** : Settings › Git › Deploy Hooks › créer un hook sur la branche de production, puis coller son adresse dans la console Vibe.IA (fiche du client › « Site du client »). Chaque publication dans le cockpit relance alors un déploiement (contenu en ligne 1 à 2 minutes après la validation).

Sans `VIBEIA_API_URL` ou `VIBEIA_SITE_KEY`, la construction réussit avec des pages « bientôt » et le formulaire de contact passe par Web3Forms. Si l'API répond en erreur, la construction échoue : Vercel garde la version en ligne.

## Essai en local
La construction écrit dans le dépôt (pages générées, blocs de l'accueil, `llms.txt`, `llms-full.txt`) : faire l'essai dans une **copie** du dépôt, ou vider les blocs avant de committer avec une construction hors ligne.
```bash
VIBEIA_API_URL=http://localhost:3000/api/v1 VIBEIA_SITE_KEY=vk_… SITE_URL=http://localhost:3001 node vibeia/build.mjs
vercel dev --listen 3001                                   # site + fonctions /api
SITE_URL=http://localhost:3001 node vibeia/build.mjs       # sans clé : vide les blocs avant de committer
```
Ne pas utiliser `git checkout index.html` pour annuler : cela efface aussi les modifications non commitées de l'accueil.
