// Convierte las imágenes de public/images a WebP (calidad 90, máx. 1600px).
// Flujo: copia tus fotos tal cual a public/images/**, corre `npm run optimize`,
// revisa el resultado y haz commit. Los originales se reemplazan por el .webp.
import { readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const IMAGES_DIR = fileURLToPath(new URL('../public/images', import.meta.url))
const DERIVED_DIR = path.join(IMAGES_DIR, 'derived')
const MAX_DIMENSION = 1600
const QUALITY = 90
const CONVERTIBLE = /\.(jpe?g|png)$/i

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (full === DERIVED_DIR) continue
      yield* walk(full)
    } else {
      yield full
    }
  }
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`
let converted = 0

for await (const file of walk(IMAGES_DIR)) {
  const original = await stat(file)

  if (CONVERTIBLE.test(file)) {
    const target = file.replace(CONVERTIBLE, '.webp')
    // .rotate() aplica la orientación EXIF (fotos de iPhone en vertical).
    await sharp(file)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(target)
    await unlink(file)
    const result = await stat(target)
    console.log(`✔ ${path.relative(IMAGES_DIR, file)} → ${path.basename(target)}  (${kb(original.size)} → ${kb(result.size)})`)
    converted++
  } else if (/\.webp$/i.test(file)) {
    const meta = await sharp(file).metadata()
    if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
      const buffer = await sharp(file)
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside' })
        .webp({ quality: QUALITY })
        .toBuffer()
      await writeFile(file, buffer)
      const result = await stat(file)
      console.log(`✔ ${path.relative(IMAGES_DIR, file)} redimensionada  (${kb(original.size)} → ${kb(result.size)})`)
      converted++
    }
  }
}

console.log(converted ? `\n${converted} imagen(es) optimizada(s).` : 'No hay imágenes nuevas por optimizar.')
