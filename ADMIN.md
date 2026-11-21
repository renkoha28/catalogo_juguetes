# Admin panel & image pipeline

> **For the owner:** there's a non-technical guide in Spanish at [GUIA-ADMIN.md](GUIA-ADMIN.md) covering the panel step by step, including a dictionary for the UI's English buttons (Sveltia's interface isn't available in Spanish yet — tracked upstream until their 1.0 string freeze opens localization).

## Admin panel (Sveltia CMS)

The admin lives at `/admin/` on the deployed site (and at `http://localhost:5173/admin/` in dev). It edits the JSON files under `content/` and uploads images by committing directly to this GitHub repo; every save triggers the Cloudflare Pages deploy (~1 min to go live).

Content structure (`content/`):
- `products/*.json` — one file per product → a real, searchable **Productos** collection in the admin (thumbnail grid, "New Producto" button, per-product commits). Each product holds up to 4 photos (front, back, left side, right side), up to 2 optional videos, price in COP, descriptions, an **available** toggle, and its reference.
- `categories/*.json` — one file per category (`order` for tab position, `prefix` for the reference code).
- `business.json`, `about.json`, `social.json`, `currencies.json`, `settings.json` — the "Información general" section: business info (including logo, navbar logo, and cover), the founder's story, social links, the base currency and its exchange rates, and message templates.
- Prices are typed **only in COP**; the other currencies are calculated from the rates in `currencies.json`, so updating one rate re-prices the whole catalog.

The site imports these files at build time (no runtime fetch): Vite bundles whatever exists in `content/` — adding/removing product files requires no code changes, and a malformed JSON fails the build instead of silently breaking the page.

Every uploaded image is converted **in the browser, before committing**, to WebP quality 90, max 1600px — so heavy iPhone photos never reach the repo. The product photo field uses `accept: image/*` (instead of Sveltia's default list of concrete MIME types) on purpose: on Android, a generic `image/*` makes the OS offer the gallery app with its albums, while a specific type list tends to open the bare "Recents" file picker where the owner couldn't find her folders.

### Product videos

The `videos` field (list of `file` widgets) commits clips to `public/videos/products/` — a separate folder so the image scripts (`optimize-images.mjs`, `generate-derivatives.mjs`), which treat everything under `public/images/` as an image, never touch them. The field carries its own media-library config raising `max_file_size` to **25 MB** (Cloudflare Pages' per-file serving limit — anything bigger would deploy but never be served) and an `accept` limited to MP4/WebM, since iPhone `.mov` (HEVC) doesn't play in most browsers. Sveltia has no video transcoding, so files are committed as-is; the owner guide teaches the "send it to yourself on WhatsApp" trick to get a compressed MP4. `ProductDetail.vue` renders them in the same gallery as the photos (photos first), with a play badge on the thumbnails.

### Featured products manager (`public/admin/destacados.html` + `destacados.js`)

Marking home-page featured products one by one (open product → toggle → save → repeat) was slow, and Sveltia has no bulk-edit. `/admin/destacados.html` is a standalone page that lists every product (photo, name, reference · category) with a checkbox and saves all changes in **one commit** (= one Pages deploy). It's styled to read as another section of the panel — same dark/light scheme following the system theme, Material Symbols icons, and a static replica of the Collections sidebar whose items link back into the real CMS:

- **Auth:** reuses the GitHub token Sveltia stores in `localStorage` under `sveltia-cms.user` after signing in at `/admin/` — no second login. Fallback for local dev (where Sveltia's "local repository" backend has no token): paste a PAT, kept in `sessionStorage` only. A 401/403 sends the user back to the login screen.
- **Data:** repo/branch are parsed from `/admin/config.yml` (single source of truth); products are read fresh from the GitHub git-data API (branch → tree → blobs), so it sees commits that haven't deployed yet — unlike `catalog-index.json`. Entries without an `id` are skipped, same as the site does.
- **Save:** re-fetches each changed file at save time and only flips `featured` (parallel edits from the panel aren't clobbered), then builds tree → commit → ref update. Files are re-serialized with 2-space indent + trailing newline, matching how they're stored, so the diff is just the `featured` line.
- The page mirrors `Home.vue`'s rules (`FEATURED_LIMIT = 4`, reference order, fallback to first products when none are marked) and warns when more than 4 are starred. The per-product **Destacado** toggle in the panel keeps working — both write the same flag.
- Discoverability: Sveltia's collections menu isn't extensible via config, so `public/admin/menu-links.js` injects "Destacados" and "Subir fotos" items into it by **cloning an existing menu item** (inheriting the exact markup/styles of the loaded Sveltia version) and swapping its label, Material Symbols icon, and entry-count badge. A MutationObserver re-injects them whenever Sveltia re-renders the sidebar; if the user is signed in and the menu can't be found after several attempts (markup drift in a future Sveltia release), floating gold buttons appear as fallback so the pages are never unreachable. The dev server also rewrites `/admin/destacados` and `/admin/fotos` to their `.html` files like it does for `/admin`.

### Photo uploader (`public/admin/fotos.html` + `fotos.js`)

Uploading through Sveltia failed often on the owner's Android phone. Sveltia decodes every picked photo at full resolution (12–50 MP → 50–200 MB of pixels each) and processes a batch concurrently, then sends everything in one save. `/admin/fotos.html` is a dedicated page, built like Destacados (same session reuse, same config parsing, same styling):

- **Picking:** two inputs. *Buscar en Archivos* has no `accept`, so Android opens the full document browser (every folder, search by name, real file names). *Elegir de la Galería* uses `accept="image/*"`, which on Android opens the system photo picker. That picker shows only some albums and hands files over named by media ID (`1000183013.jpg`); that's where the numeric file names in the repo came from.
- **Matching:** a file whose name contains a product reference at a word boundary (`PC-015-1.jpg`, `pc015 frente.jpg`, `PC_15.jpg`; not `PC-0151` or `PPC-015`) goes to that product; longest reference wins. Unmatched files go to the optional default product, or to a *Sin producto* box with a product dropdown. Within a product, new photos are ordered by natural filename sort.
- **Preview/edit:** each product shows its *final* photo list (current + new) with reorder/remove; "Quitar las fotos actuales" turns it into a replacement. Saving is blocked while any photo is unassigned, errored, still converting, or a product would exceed 4 photos.
- **Conversion stays on the phone** (it's what keeps each upload ~300 KB instead of ~4 MB) but runs **one photo at a time**, decoding straight to the target size with `createImageBitmap(file, { resizeWidth, resizeHeight, imageOrientation: 'from-image' })`, so the full-size bitmap is never materialized. Output is WebP q90, max 1600 px, same as `optimize-images.mjs`; JPEG q90 where WebP encoding isn't available (Safari). HEIC (undecodable in Chrome) gets an explicit error.
- **Upload:** each photo is its own `POST /git/blobs` with a 90 s timeout, 5 attempts with backoff, and a wait for `online` when the browser reports offline. Uploaded blob SHAs are kept, so the **Reintentar** button resumes from the first missing photo. A screen wake lock is held during upload.
- **Save:** one tree → commit → ref update with the new image paths, the re-fetched product JSONs (only `images` changes) and deletions of removed photos that no other product references. A `422` on the ref update (someone saved from the panel meanwhile) rebuilds the commit on the new head, up to 3 times.
- **Naming:** `<ref-lowercased>-<n>.<ext>` with n = highest existing 1–3 digit suffix for that reference + 1, so existing files are never overwritten. The photo order is stored in the JSON `images` list, not in the file name, so reordering doesn't rename files.
- `fotos.html?ref=PC-015` preselects the default product.

Sveltia's own image field also names uploads after the product now (`filename_template: '{{fields.id}}-{{uuid_shorter}}'` → `pc-015-3f9a1c2b.webp`). The random suffix avoids clashing with the uploader's numbering, and the uploader only counts 1–3 digit suffixes, so an all-digit random suffix can't push its numbering up. A field-level media library config *replaces* the global one, so the field repeats the transformations via a YAML anchor.

### Pinned Sveltia version

`public/admin/index.html` loads `@sveltia/cms@<version>` instead of the unversioned URL, which served whatever was released last (often several releases a week) and could change the panel, or the markup `menu-links.js` depends on, from one day to the next. To upgrade: bump the number, then on a phone upload a photo through a product, save, and check that both injected menu items still appear.

### Renaming existing product photos (`scripts/rename-product-images.mjs`)

One-time migration to `<ref>-<position>.<ext>` (position = index in `images`, 1-based). Dry-run by default; `--apply` renames on disk via temporary names (safe for swaps) and rewrites the product JSONs. Photos referenced by more than one content JSON, missing on disk, or whose target name is occupied by an unrelated file are skipped with a warning. Run it right after `git pull` and commit/push immediately, since the panel keeps committing to `main`.

### The reference widget (`public/admin/reference-widget.js`)

References (`PC-001`) are the catalog's primary key, but Sveltia has no `unique` option and doesn't detect slug collisions — duplicates used to slip in silently. The `id` field therefore uses a custom widget, and references are now **fully automatic — the owner never types one**:

- **New product**: the widget shows only a category dropdown; it scans the known references for that prefix (deploy-time index + this browser session's saves) and assigns highest-in-use + 1, zero-padded to 3 digits. Changing the category re-assigns. Gaps from deleted products are deliberately *not* refilled, since a retired reference may still be quoted in old posts or chats.
- **Existing product**: the reference renders read-only with a lock note — changing the catalog's primary key after publication breaks quoted orders, so it's simply not offered (edit the JSON manually if it's ever truly needed). Legacy references with suffixes (`PC-001-B`) stay as they are.
- `isValid()` still blocks a taken reference as a safety net for a stale index (e.g. a product created from another browser since the last deploy).
- If `catalog-index.json` can't be loaded there's nothing to count against, so the widget degrades to a raw text input (emergency mode, developer-oriented).

It only uses public, Decap-compatible APIs — custom widgets receive just their own value, never sibling fields, which is why the category picker lives *inside* the widget:

- `CMS.registerWidget('reference', …)` — a `create-react-class` control built with `window.h` (no build step; the file is plain JS served as-is).
- `isValid()` on the control — returns `{ error: { message } }` for a duplicate, which blocks saving.
- `preSave` event — writes `category` into the entry from the reference prefix, so the JSON keeps an explicit category and the frontend is unchanged. `category` stays declared as a `hidden` field so it survives edits and remains sortable.
- `postSave` event — records the new reference in `localStorage`, so creating several products back-to-back detects collisions before the next deploy.

`index.html` sets `window.CMS_MANUAL_INIT = true` and loads both scripts **without** `type="module"`: the widget must be registered before Sveltia validates the config (an unregistered widget name is an unknown-widget error), and the widget file calls `CMS.init()` at the end. Sveltia itself warns against `type="module"` when using the JS API.

Available references come from `public/admin/catalog-index.json`, regenerated on every `npm run dev` / `npm run build` by `scripts/generate-admin-index.mjs` (it's gitignored — a build artifact). The repo is private, so the panel can't query GitHub anonymously; the index therefore reflects the **last deploy**, and `localStorage` covers everything created since. If the index can't be loaded the widget degrades to a plain text input rather than blocking work.

### Finishing the authentication setup (one-time, your GitHub account)

Sveltia needs a way to log into GitHub. Two options:

**Option A — OAuth via Cloudflare Worker (recommended, needed for her later):**
1. Deploy the official worker: https://github.com/sveltia/sveltia-cms-auth (one-click "Deploy to Cloudflare Workers" button in its README).
2. Create a GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: your Cloudflare Pages URL
   - Authorization callback URL: `https://<your-worker>.workers.dev/callback`
3. Set the Worker's environment variables `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `ALLOWED_DOMAINS` (your Pages domain).
4. In `public/admin/config.yml`, uncomment `base_url` and point it to the Worker URL.

**Option B — no setup, local editing (works today):**
Run `npm run dev`, open `http://localhost:5173/admin/` in Chrome/Edge, and choose **"Work with Local Repository"** — Sveltia edits the files on disk directly; you review and commit with git as usual. Great for testing the panel before wiring OAuth.

> Note: when the time comes to give her access, add her (future) GitHub account as a collaborator on the repo — the OAuth flow will then let her log in with her own identity.

## Image workflow (manual, without the admin)

1. Drop photos as-is (JPG/PNG straight from the phone) anywhere under `public/images/` — e.g. `public/images/products/product-007-1.jpg`.
2. Run `npm run optimize` — converts them in place to WebP quality 90, max 1600px, fixes iPhone rotation, deletes the originals, and prints the size savings.
3. Reference the resulting `.webp` paths in `business.json` (or via the admin), then commit.

## Responsive derivatives (automatic)

`npm run dev` and `npm run build` first run `npm run derive`, which generates 400px and 800px WebP versions of every raster image into `public/images/derived/` (gitignored — never committed, regenerated on every build, including on Cloudflare Pages). Components request them via `srcset`, so phones download the small versions. SVG placeholders are skipped.

## Cloudflare Pages settings

- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: single-page app fallback is automatic on Pages; `/admin/` is a real file and is served as-is.
