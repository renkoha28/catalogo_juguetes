// Genera versiones responsivas (400px y 800px) de cada imagen rasterizada en
// public/images/derived/. Corre automáticamente antes de `dev` y `build`; la
// carpeta derived/ está en .gitignore y nunca se commitea.
import { readdir, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const IMAGES_DIR = fileURLToPath(new URL('../public/images', import.meta.url))
const DERIVED_DIR = path.join(IMAGES_DIR, 'derived')
const WIDTHS = [400, 800]
const RASTER = /\.(webp|jpe?g|png)$/i

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (full === DERIVED_DIR) continue
      yield* walk(full)
    } else if (RASTER.test(entry.name)) {
      yield full
    }
  }
}

let generated = 0

for await (const file of walk(IMAGES_DIR)) {
  const relative = path.relative(IMAGES_DIR, file)
  const source = await stat(file)

  for (const width of WIDTHS) {
    const target = path.join(DERIVED_DIR, relative.replace(RASTER, `-${width}.webp`))
    try {
      const existing = await stat(target)
      if (existing.mtimeMs >= source.mtimeMs) continue
    } catch {
      // No existe todavía: generarla.
    }
    await mkdir(path.dirname(target), { recursive: true })
    await sharp(file)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(target)
    generated++
  }
}

console.log(`Derivadas responsivas generadas: ${generated}`)
