// Genera public/admin/catalog-index.json: la lista de referencias ya usadas y
// las categorías con su prefijo. El panel lo usa para armar la referencia
// (PC-001) y avisar si ya está ocupada.
//
// El repo es privado, así que el panel no puede consultar GitHub sin token:
// este índice se regenera en cada build (npm run dev / npm run build), o sea
// que refleja el catálogo publicado. Lo que se crea después queda registrado
// en el navegador (localStorage) hasta el siguiente despliegue, para que crear
// varios productos seguidos siga detectando choques.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = join(root, 'content')
const outFile = join(root, 'public', 'admin', 'catalog-index.json')

const readJsonDir = async (dir) => {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'))
  return Promise.all(
    files.map(async (file) => ({
      slug: file.replace(/\.json$/, ''),
      data: JSON.parse(await readFile(join(dir, file), 'utf8')),
    }))
  )
}

const categories = (await readJsonDir(join(contentDir, 'categories')))
  .map(({ data }) => ({
    id: data.id,
    name: data.name,
    prefix: data.prefix ?? '',
    order: data.order ?? 99,
  }))
  .sort((a, b) => a.order - b.order)

// `slug` es el nombre del archivo, que no siempre coincide con el id (hay
// productos viejos creados a mano); se guarda para poder enlazar al producto
// desde el aviso de referencia ocupada.
const products = (await readJsonDir(join(contentDir, 'products')))
  .map(({ slug, data }) => ({
    id: data.id ?? slug,
    name: data.name ?? '',
    category: data.category ?? '',
    slug,
  }))
  .sort((a, b) => String(a.id).localeCompare(String(b.id)))

const withoutPrefix = categories.filter((c) => !c.prefix).map((c) => c.id)

if (withoutPrefix.length) {
  console.warn(
    `⚠️  Categorías sin prefijo (no se podrán elegir al crear un producto): ${withoutPrefix.join(', ')}`
  )
}

await mkdir(dirname(outFile), { recursive: true })
await writeFile(
  outFile,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), categories, products }, null, 2)}\n`
)

console.log(
  `Índice del panel: ${categories.length} categorías, ${products.length} referencias registradas.`
)
