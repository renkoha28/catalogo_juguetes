<script setup>
import { computed, ref, watch } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'
import { SOCIAL_ICONS } from '../assets/socialIcons'
import ProductCard from '../components/ProductCard.vue'

const props = defineProps({
  id: { type: String, required: true },
})

const {
  business,
  products,
  categories,
  displayPrice,
  referenceMessage,
  whatsappLink,
  instagramDmLink,
  facebookDmLink,
} = useCatalog()

const product = computed(() => products.value.find((p) => p.id === props.id) ?? null)

const category = computed(
  () => categories.value.find((c) => c.id === product.value?.category) ?? null
)

// Más de la misma categoría (sin el producto actual), para seguir mirando.
const related = computed(() =>
  product.value
    ? products.value
        .filter((p) => p.category === product.value.category && p.id !== product.value.id)
        .slice(0, 4)
    : []
)

// Fotos y videos comparten la galería: primero las fotos (la primera es la
// portada del catálogo) y al final los videos, con un icono de play.
const media = computed(() => {
  if (!product.value) return []
  const images = product.value.images ?? (product.value.image ? [product.value.image] : [])
  const videos = product.value.videos ?? []
  return [
    ...images.map((src) => ({ type: 'image', src })),
    ...videos.map((src) => ({ type: 'video', src })),
  ]
})

const activeIndex = ref(0)
watch(() => props.id, () => (activeIndex.value = 0))

const activeMedia = computed(() => media.value[activeIndex.value] ?? media.value[0])

const thumbStripRef = ref(null)
const thumbEls = []

function setThumbRef(el, i) {
  if (el) thumbEls[i] = el
}

function selectMedia(i) {
  activeIndex.value = i
  const el = thumbEls[i]
  const strip = thumbStripRef.value
  if (!el || !strip) return
  strip.scrollTo({
    left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2,
    behavior: 'smooth',
  })
}

// Deslizar sobre la foto grande pasa a la siguiente/anterior (en móvil es lo
// natural; las miniaturas siguen ahí para saltar directo).
let touchStartX = null
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e) {
  if (touchStartX == null || media.value.length < 2) return
  const delta = e.changedTouches[0].clientX - touchStartX
  touchStartX = null
  if (Math.abs(delta) < 40) return
  const n = media.value.length
  selectMedia((activeIndex.value + (delta < 0 ? 1 : -1) + n) % n)
}

const MAIN_SIZES = '(min-width: 768px) 50vw, 100vw'

const promises = computed(() => (business.value.highlights ?? []).map((h) => h.title).filter(Boolean))

const copied = ref(false)

async function copyReference() {
  if (!product.value) return
  await navigator.clipboard.writeText(referenceMessage(product.value))
  copied.value = true
  setTimeout(() => (copied.value = false), 2500)
}
</script>

<template>
  <main class="pb-20">
    <div v-if="product" class="mx-auto max-w-6xl px-4">
      <nav class="flex items-center gap-2 pt-6 text-xs uppercase tracking-[0.2em] text-mist" aria-label="Migas de pan">
        <router-link :to="{ name: 'catalog' }" class="inline-flex min-h-11 items-center gap-2 text-gold-300 hover:text-gold-200">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Catálogo
        </router-link>
        <template v-if="category">
          <span aria-hidden="true">/</span>
          <router-link
            :to="{ name: 'catalog', query: { categoria: category.id } }"
            class="truncate hover:text-rose"
          >
            {{ category.name }}
          </router-link>
        </template>
      </nav>

      <div class="mt-4 grid gap-10 md:grid-cols-2 md:items-start">
        <!-- ============================== Galería -->
        <div class="min-w-0 md:sticky md:top-24">
          <div
            class="relative overflow-hidden rounded-3xl bg-satin ring-1 ring-gold-500/20"
            @touchstart.passive="onTouchStart"
            @touchend="onTouchEnd"
          >
            <!-- El key recrea el <video> al cambiar de vista (si no, el
                 anterior seguiría sonando). autoplay exige muted. -->
            <video
              v-if="activeMedia?.type === 'video'"
              :key="activeMedia.src"
              :src="activeMedia.src"
              controls
              autoplay
              muted
              playsinline
              preload="metadata"
              class="aspect-square w-full bg-noir object-contain"
              :aria-label="`${product.name} — video`"
            />
            <img
              v-else
              v-bind="imageProps(activeMedia?.src, MAIN_SIZES)"
              :alt="`${product.name} — vista ${activeIndex + 1}`"
              class="aspect-square w-full object-contain"
              :class="{ 'opacity-50 grayscale': product.available === false }"
            />
            <span
              v-if="product.available === false"
              class="absolute left-4 top-4 rounded-full bg-noir/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose"
            >
              Agotado
            </span>
            <span
              v-if="media.length > 1"
              class="absolute bottom-4 right-4 rounded-full bg-noir/75 px-3 py-1 text-xs font-medium text-rose"
            >
              {{ activeIndex + 1 }} / {{ media.length }}
            </span>
          </div>

          <div
            v-if="media.length > 1"
            ref="thumbStripRef"
            class="no-scrollbar mt-3 flex gap-2 overflow-x-auto p-1"
            role="group"
            aria-label="Vistas del producto"
          >
            <button
              v-for="(item, i) in media"
              :key="item.src"
              :ref="(el) => setThumbRef(el, i)"
              class="relative w-20 flex-none overflow-hidden rounded-xl bg-satin ring-2 transition-all first:ml-auto last:mr-auto sm:w-24"
              :class="i === activeIndex ? 'ring-gold-400' : 'ring-transparent opacity-60 hover:opacity-100'"
              :aria-label="item.type === 'video' ? 'Ver video' : `Ver vista ${i + 1}`"
              :aria-pressed="i === activeIndex"
              @click="selectMedia(i)"
            >
              <video
                v-if="item.type === 'video'"
                :src="item.src"
                preload="metadata"
                muted
                tabindex="-1"
                class="pointer-events-none aspect-square w-full bg-noir object-contain"
              />
              <img
                v-else
                v-bind="imageProps(item.src, '96px')"
                :alt="`${product.name} — miniatura ${i + 1}`"
                loading="lazy"
                decoding="async"
                class="aspect-square w-full object-contain"
              />
              <span
                v-if="item.type === 'video'"
                class="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" class="h-7 w-7 fill-rose drop-shadow-md"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </button>
          </div>
        </div>

        <!-- ============================== Información y pedido -->
        <div class="flex flex-col gap-5">
          <div>
            <p v-if="category" class="text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">
              {{ category.name }}
            </p>
            <h1 class="mt-2 font-display text-4xl italic leading-tight text-rose sm:text-5xl">
              {{ product.name }}
            </h1>
            <p class="mt-2 text-xs uppercase tracking-[0.2em] text-mist">Ref. {{ product.id.toUpperCase() }}</p>
          </div>

          <p class="font-display text-4xl text-gold-sheen">{{ displayPrice(product) }}</p>

          <p
            v-if="product.available === false"
            class="rounded-2xl bg-noir-700 px-4 py-3 text-sm text-mist ring-1 ring-wine-600/50"
          >
            Este producto está agotado por ahora. Escríbenos y te avisamos cuando vuelva.
          </p>

          <p v-if="product.shortDescription" class="font-medium text-rose">{{ product.shortDescription }}</p>
          <p v-if="product.description" class="whitespace-pre-line leading-relaxed text-mist">
            {{ product.description }}
          </p>

          <div class="gold-rule" aria-hidden="true" />

          <div class="rounded-3xl bg-noir-800 p-5 ring-1 ring-gold-500/20">
            <p class="font-display text-xl italic text-gold-300">¿Lo quieres? Pídelo así:</p>

            <a
              v-if="whatsappLink(product)"
              :href="whatsappLink(product)"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-gold mt-4 w-full"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true"><path :d="SOCIAL_ICONS.whatsapp" /></svg>
              Pedir por WhatsApp
            </a>
            <p v-if="whatsappLink(product)" class="mt-2 text-center text-xs text-mist">
              El mensaje ya lleva el nombre y la referencia. Solo presiona enviar.
            </p>

            <div v-if="instagramDmLink || facebookDmLink" class="mt-5 border-t border-gold-500/15 pt-5">
              <p class="text-xs leading-relaxed text-mist">
                ¿Prefieres Instagram o Facebook? Ahí no podemos escribir el mensaje por ti:
                <strong class="text-rose">copia la referencia</strong> y pégala en el chat.
              </p>
              <div class="mt-3 grid gap-2">
                <button type="button" class="btn-outline w-full py-2.5 text-sm" @click="copyReference">
                  {{ copied ? '✓ ¡Copiado!' : 'Copiar referencia' }}
                </button>
                <div class="grid grid-cols-2 gap-2">
                  <a
                    v-if="instagramDmLink"
                    :href="instagramDmLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-outline py-2.5 text-sm"
                    :class="{ 'col-span-2': !facebookDmLink }"
                  >
                    Instagram
                  </a>
                  <a
                    v-if="facebookDmLink"
                    :href="facebookDmLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-outline py-2.5 text-sm"
                    :class="{ 'col-span-2': !instagramDmLink }"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>

          <ul v-if="promises.length" class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-mist">
            <li v-for="item in promises" :key="item" class="flex items-center gap-2">
              <span class="text-gold-400" aria-hidden="true">✦</span>{{ item }}
            </li>
          </ul>
        </div>
      </div>

      <section v-if="related.length" class="mt-20" aria-labelledby="related-title">
        <h2 id="related-title" class="font-display text-3xl italic text-rose">También te puede gustar</h2>
        <div class="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
          <ProductCard v-for="item in related" :key="item.id" :product="item" />
        </div>
      </section>
    </div>

    <div v-else class="mx-auto max-w-md px-4 py-24 text-center">
      <p class="font-display text-3xl italic text-gold-sheen">No encontramos este producto</p>
      <p class="mt-3 text-sm text-mist">Puede que ya no esté disponible.</p>
      <router-link :to="{ name: 'catalog' }" class="btn-gold mt-8">Ir al catálogo</router-link>
    </div>
  </main>
</template>
