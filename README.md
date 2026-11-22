# catalogo_juguetes

## Project Context

### Overview

Digital business catalog for **PK2 Diva — Sex Shop**, accessed through a QR code. Sister store of `catalogo_pelucas` (same owner): it shares the content model, admin panel and photo uploader, but has its **own layout and assets** (dark boudoir design, see *Design Philosophy*).

When a customer scans the QR code, they reach a static website with:

- Business information
- Logo and cover image
- Contact information and social media
- Product catalog with categories
- Product details (4 photos per product)
- WhatsApp integration with product references
- Business location and opening hours
- Admin panel for the owner (Sveltia CMS)

The project works entirely as a static website: **no backend, no database, no authentication, no API calls at runtime**. All content lives in JSON files bundled at build time.

---

# Goals

The template is reusable. A new business only requires replacing:

- The JSON files under `content/`
- Logo, cover, and product images
- Favicons

No code modifications are necessary.

---

# Technology Stack

- **Frontend:** Vue 3 + Vite + Composition API, Vue Router
- **Styling:** Tailwind CSS 4
- **Images:** sharp (optimization scripts), WebP quality 90
- **Admin:** Sveltia CMS (Git-based, commits to this repo)
- **Deployment:** GitHub → Cloudflare Pages (every push to `main` deploys)

---

# Project Structure

```
content/                    ← ALL editable content
├── business.json           (name, slogan, description, logos, cover, contact, hours)
├── about.json              (founder story, photo, values)
├── social.json             (social links & handles)
├── settings.json           (WhatsApp message templates)
├── currencies.json         (base currency + exchange rates for the other currencies)
├── categories/*.json       (one file per category: tab order + reference `prefix`)
└── products/*.json         (one file per product)

public/
├── admin/                  (Sveltia CMS: index.html + config.yml)
├── images/
│   ├── products/           (product photos, WebP)
│   ├── categories/
│   ├── logo.webp, navbar-logo.webp, cover, about…
│   └── derived/            (responsive 400/800px versions — generated, gitignored)
└── favicon.ico, *.png, site.webmanifest

scripts/
├── optimize-images.mjs     (npm run optimize — WebP q90, max 1600px)
└── generate-derivatives.mjs (runs before dev/build)

src/
├── components/  NavBar, BusinessHeader, SocialButtons, CategoryTabs,
│                ProductCard, Footer, FloatingWhatsApp
├── composables/ useCatalog.js   (imports content/ at build time)
├── pages/       Home, Catalog, ProductDetail, About, Social
├── utils/       images.js       (srcset helper)
├── router/
├── App.vue
└── main.js
```

---

# Data Source

All content is imported **at build time** from `content/` (Vite glob imports — no runtime fetch). Adding or removing a product/category file requires no code changes; a malformed JSON fails the build instead of breaking the live site.

---

# Products

Categories live in `content/categories/*.json` (editable in the admin; each has `prefix`, optional `description` and `image`, and `order`). Initial set:

| Prefix | Category |
| ------ | -------- |
| `VB-`  | Vibradores |
| `DL-`  | Dildos |
| `PA-`  | Para parejas |
| `EL-`  | Para él |
| `AN-`  | Juego anal |
| `LE-`  | Lencería y disfraces |
| `LU-`  | Lubricantes y cosmética |
| `BD-`  | BDSM y fetiche |

Product references follow the pattern `<prefix>-<3-digit code>`, e.g. `VB-001`. Photos uploaded through *Subir fotos* are named `vb-001-1.webp`, `vb-001-2.webp`…

Each product (`content/products/<ref>.json`):

- `id` — unique reference (e.g. `PC-001`), quoted by customers when ordering. **Primary key**: prefix (category) + code, built and uniqueness-checked by the admin's reference widget
- `name`, `shortDescription`, `description`
- `price` — a single number, always in the **base currency** (COP); every other currency is derived from it. Defaults to `0`
- `category` — id of a category file, written automatically from the reference prefix when saving from the admin (the frontend re-derives it if missing)
- `images` — up to **4 photos**: front, back, left side, right side (first = catalog thumbnail)
- `videos` — optional, up to **2 short MP4/WebM clips** (max 25 MB each), stored in `public/videos/products/`; shown in the product-page gallery after the photos
- `available` — false shows an "Agotado" badge
- `featured` — shown in the Home "Destacados" section (max 4; falls back to the first products if none are marked). Toggled per product in the admin, or in bulk from `/admin/destacados.html`

**Currencies:** defined in `currencies.json` — a `base` currency (COP, the one typed into each product) plus a list of `others`, each with an exchange `rate` and an optional `roundTo`.

```jsonc
{
  "base":   { "code": "COP", "symbol": "$", "name": "Pesos colombianos" },
  "others": [{ "code": "USD", "symbol": "US$", "name": "Dólares estadounidenses",
               "rate": 4000, "roundTo": 1 }]
}
```

`rate` is **how many COP one unit of that currency is worth** (dollar at 4.100 → `4100`), which is how the exchange rate is quoted locally. Displayed price = `price / rate`, rounded to the nearest `roundTo` multiple (`1` = whole dollars, `0.01` = exact cents). Converted prices are prefixed with `≈` since the sale itself is charged in COP.

Adding a currency to `others` (from the admin, no code change) makes it appear as a button in the footer selector; the visitor's choice is remembered in the browser. Updating a rate re-prices the whole catalog at once. A currency with a missing or zero rate is ignored rather than rendering broken prices.

---

# Images

- Stored in `public/images/`, format **WebP quality 90**, max 1600px.
- Workflow: drop phone photos → `npm run optimize` → commit. (Admin uploads are converted in the browser automatically.)
- `npm run dev` / `npm run build` generate 400px/800px derivatives into `public/images/derived/` (gitignored); components use `srcset` so phones download small versions.
- Favicons are PNG/ICO in `public/` root (WebP is not used for favicons).

---

# Pages

- **Inicio** — full-screen hero (glowing logo, slogan, CTAs; optional cover photo behind), animated ribbon with the `business.highlights` titles, category tiles with product counts, featured products ("Favoritos", carousel on mobile), promise cards, WhatsApp call-to-action
- **Catálogo** — sticky, horizontally scrolling category chips (selection kept in `?categoria=`), product grid (2 columns on mobile, up to 4 on desktop), "Muy pronto" empty state
- **Producto** (`/catalogo/:id`) — photo + video gallery (swipe on mobile), description, price, order box (WhatsApp, copy reference, Instagram/Facebook), related products
- **Nosotros** — story and values (logo shown when there's no photo)
- **Contacto** (`/redes`) — social/contact cards and opening hours

Navigation: sticky blurred bar with the round emblem + name; full-screen menu on mobile. **Age gate:** a "¿Eres mayor de 18?" screen on first visit, remembered in `localStorage`; toggled by `settings.ageGate` (Ajustes in the admin).

---

# Ordering flow (no sales in the app)

Every purchase happens off-site through her channels:

- **WhatsApp (primary):** `https://wa.me/PHONE?text=MESSAGE` with the message pre-filled from a template including the product name and reference — customer just taps send.
- **Instagram / Facebook:** DM links (`ig.me/m/…`, `m.me/…`) can open the chat but cannot pre-fill text, so the product page offers a **"Copiar referencia"** button — customer copies the reference message and pastes it in the chat.

The contact row (Instagram, Facebook, TikTok, WhatsApp, Maps, website, phone, email) is declared in `CHANNEL_SOURCES` (`useCatalog.js`), which sets both the display order and where each channel reads from: profiles and WhatsApp come from `social.json`, while Maps, phone and email are business facts and come from `business.json` — the same fields the footer renders, so the two can never disagree. A channel renders only when its value is non-empty.

---

# Admin Panel

Sveltia CMS at `/admin/` — see [ADMIN.md](ADMIN.md) for setup and usage. The owner can manage products (searchable collection with thumbnails), categories, business info, her story, social links, and message templates. Saves commit to `main` and auto-deploy.

---

# Performance Goals

Lighthouse > 95 in Performance, Accessibility, SEO, and Best Practices.

---

# Design Philosophy

Brand: **black, wine red & gold**, sampled from the logo (glossy red devil heart, gold ring and lettering on black). The whole site is dark: boudoir mood with red glows and gold hairlines. Tokens in `src/style.css` (`noir-*`, `wine-*`, `gold-*`, `rose`, `mist`, `satin`) plus component classes `btn-gold`, `btn-outline`, `bg-ember`, `gold-rule`, `text-gold-sheen`. Product photos sit on a light `satin` panel since most come on white backgrounds. Type: **Playfair Display** italic (headings, echoing the logo's script) + **Poppins** (body, shared with the sister store). Minimal, fast, responsive, touch friendly, large buttons and images, few clicks. Mobile first; desktop excellent too.

---

# Code Guidelines

- Composition API; small components; computed over watchers; reusable composables.
- **Never hardcode business information in components — everything comes from `content/`.**

---

# Deployment

GitHub repo → Cloudflare Pages. Build command `npm run build`, output `dist/`. Every push to `main` (including admin saves) triggers a deployment.

---

# Status / Roadmap

**Done:** multi-page site, JSON content model, responsive layout, social buttons, product grid + detail with 4-photo gallery, WhatsApp reference flow, availability toggle, image pipeline, admin panel config.

**Pending:** deploy to Cloudflare Pages, OAuth Worker for admin login on the live site, real content and photos, final name for the third product type.

**Future:** search, animations, SEO improvements, PWA, multiple businesses, analytics.
