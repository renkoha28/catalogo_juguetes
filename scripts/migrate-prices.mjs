// Convierte el esquema viejo de precios al nuevo:
//
//   "prices": { "COP": 200000, "USD": 59 }   ->   "price": 200000
//
// Ahora solo se escribe a mano el precio en la moneda base (COP); las demás
// monedas se calculan con las tasas de content/currencies.json.
//
// Es idempotente: los productos que ya tienen `price` se dejan intactos, así
// que se puede volver a correr después de un `git pull` (el CMS sigue creando
// productos en GitHub y los que se hayan creado con el esquema viejo se
// migran en la siguiente pasada).
//
//   node scripts/migrate-prices.mjs        (o: npm run migrate:prices)

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const productsDir = join(root, 'content', 'products')

const { base } = JSON.parse(await readFile(join(root, 'content', 'currencies.json'), 'utf8'))
const baseCode = base?.code ?? 'COP'

// Del objeto viejo nos quedamos con la moneda base; si ese producto no la
// tenía, con el primer valor numérico que haya (mejor eso que perder el dato).
const pickBaseAmount = (prices) => {
  if (prices == null || typeof prices !== 'object') return null
  const amount = prices[baseCode] ?? Object.values(prices).find((v) => Number.isFinite(Number(v)))
  return Number.isFinite(Number(amount)) ? Number(amount) : null
}

const files = (await readdir(productsDir)).filter((f) => f.endsWith('.json'))
let migrated = 0
let skipped = 0

for (const file of files) {
  const path = join(productsDir, file)
  const product = JSON.parse(await readFile(path, 'utf8'))

  if (!('prices' in product)) {
    skipped += 1
    continue
  }

  const amount = pickBaseAmount(product.prices)

  if (amount == null) {
    console.warn(`⚠️  ${file}: no se encontró un precio numérico, se deja como está`)
    skipped += 1
    continue
  }

  // Object.entries preserva el orden de las claves: `price` queda en el mismo
  // lugar donde estaba `prices`, así los diffs en GitHub son mínimos.
  const updated = Object.fromEntries(
    Object.entries(product).flatMap(([key, value]) => {
      if (key === 'prices') return 'price' in product ? [] : [['price', amount]]
      return [[key, value]]
    })
  )

  await writeFile(path, `${JSON.stringify(updated, null, 2)}\n`)
  console.log(`✔️  ${file}: prices → price (${amount} ${baseCode})`)
  migrated += 1
}

console.log(`\n${migrated} producto(s) migrado(s), ${skipped} sin cambios.`)
