// Renombra las fotos de producto al patrón <referencia>-<posición>:
//
//   /images/products/1220980.webp   ->   /images/products/pc-001-1.webp
//
// La posición sale del orden en `images` del JSON (1 = la del catálogo). Se
// renombra el archivo en public/images/products/ y se actualiza el JSON.
//
// Por defecto SOLO MUESTRA lo que haría. Para aplicarlo:
//
//   node scripts/rename-product-images.mjs            (vista previa)
//   node scripts/rename-product-images.mjs --apply    (renombra de verdad)
//
// Correrlo justo después de un `git pull` y commitear/pushear enseguida: el
// panel sigue guardando en GitHub, y si alguien edita un producto en medio,
// ese commit chocaría con este.
//
// Seguro de repetir: lo que ya tiene su nombre se deja quieto. Una foto que
// usa más de un producto (u otro JSON de content/) no se toca, para no romper
// al otro. Los intercambios (a→b y b→a) se resuelven pasando por nombres
// temporales.

import { readdir, readFile, writeFile, rename, access } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const apply = process.argv.includes('--apply')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = join(root, 'content')
const productsDir = join(contentDir, 'products')
const PUBLIC_PREFIX = '/images/products/'
const diskPath = (publicPath) => join(root, 'public', publicPath)

const exists = (path) =>
  access(path).then(
    () => true,
    () => false
  )

const slug = (id) =>
  String(id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Todos los JSON de content/ (no solo productos), para contar quién usa cada foto.
const readJsonTree = async (dir) => {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await readJsonTree(path)))
    else if (entry.name.endsWith('.json')) out.push({ path, raw: await readFile(path, 'utf8') })
  }
  return out
}

const allJson = await readJsonTree(contentDir)
const references = new Map() // ruta pública -> cuántos JSON la mencionan
for (const { raw } of allJson) {
  for (const match of raw.matchAll(/"(\/images\/products\/[^"]+)"/g)) {
    references.set(match[1], (references.get(match[1]) ?? 0) + 1)
  }
}

const products = allJson
  .filter(({ path }) => path.startsWith(productsDir))
  .map(({ path, raw }) => ({ path, raw, data: JSON.parse(raw) }))
  .filter(({ data }) => data.id && Array.isArray(data.images))
  .sort((a, b) => String(a.data.id).localeCompare(String(b.data.id), 'es', { numeric: true }))

const moves = [] // { from, to, product }
const warnings = []

for (const product of products) {
  const base = slug(product.data.id)
  product.data.images.forEach((from, index) => {
    if (typeof from !== 'string' || !from.startsWith(PUBLIC_PREFIX)) return
    const to = PUBLIC_PREFIX + base + '-' + (index + 1) + extname(from).toLowerCase()
    if (from === to) return
    if ((references.get(from) ?? 0) > 1) {
      warnings.push(`${product.data.id}: ${from} la usa más de un archivo de content/, se deja igual`)
      return
    }
    moves.push({ from, to, product })
  })
}

// Validaciones contra el disco antes de tocar nada.
const movingAway = new Set(moves.map((m) => m.from))
const targets = new Set()
const valid = []
for (const move of moves) {
  if (!(await exists(diskPath(move.from)))) {
    warnings.push(`${move.product.data.id}: no existe ${move.from} en public/, se deja igual`)
    continue
  }
  if (targets.has(move.to)) {
    warnings.push(`${move.product.data.id}: ${move.to} repetido, se deja igual ${move.from}`)
    continue
  }
  // Ocupado por un archivo que no se mueve en esta pasada (huérfano u otro uso).
  if ((await exists(diskPath(move.to))) && !movingAway.has(move.to)) {
    warnings.push(`${move.product.data.id}: ${move.to} ya existe, se deja igual ${move.from}`)
    continue
  }
  targets.add(move.to)
  valid.push(move)
}

for (const { from, to } of valid) console.log(`  ${from}  ->  ${to}`)
for (const warning of warnings) console.warn(`⚠️  ${warning}`)

const touchedProducts = new Set(valid.map((m) => m.product))
console.log(
  `\n${valid.length} foto(s) por renombrar en ${touchedProducts.size} producto(s).` +
    (warnings.length ? ` ${warnings.length} aviso(s).` : '')
)

if (!apply) {
  if (valid.length) console.log('Vista previa: nada cambió. Para aplicarlo: --apply')
  process.exit(0)
}

// Fase 1: todo a nombres temporales (resuelve intercambios). Fase 2: a su nombre final.
const stamp = Date.now()
for (const [i, move] of valid.entries()) {
  move.temp = `${move.from}.renombrando-${stamp}-${i}`
  await rename(diskPath(move.from), diskPath(move.temp))
}
for (const move of valid) await rename(diskPath(move.temp), diskPath(move.to))

for (const product of touchedProducts) {
  const renamed = new Map(valid.filter((m) => m.product === product).map((m) => [m.from, m.to]))
  product.data.images = product.data.images.map((path) => renamed.get(path) ?? path)
  // Mismo formato que escribe el panel: 2 espacios y salto de línea final.
  await writeFile(product.path, JSON.stringify(product.data, null, 2) + '\n')
}

console.log('✅ Listo. Revisa con `git status` y commitea enseguida.')
