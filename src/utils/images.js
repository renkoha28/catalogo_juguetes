const RASTER = /\.(webp|jpe?g|png)$/i

// Devuelve src/srcset/sizes apuntando a las derivadas responsivas que genera
// scripts/generate-derivatives.mjs. Los SVG (placeholders) no llevan srcset.
export function imageProps(src, sizes) {
  if (!src || !RASTER.test(src)) return { src }
  const derived = (width) =>
    src.replace('/images/', '/images/derived/').replace(RASTER, `-${width}.webp`)
  return {
    src,
    srcset: `${derived(400)} 400w, ${derived(800)} 800w, ${src} 1600w`,
    sizes,
  }
}
