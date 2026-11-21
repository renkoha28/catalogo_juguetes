<script setup>
import { computed, ref, watch } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'

const props = defineProps({
  id: { type: String, required: true },
})

const {
  products,
  categories,
  displayPrice,
  referenceMessage,
  whatsappLink,
  instagramDmLink,
  facebookDmLink,
} = useCatalog()

const product = computed(() => products.value.find((p) => p.id === props.id) ?? null)

const categoryName = computed(
  () => categories.value.find((c) => c.id === product.value?.category)?.name ?? ''
)

// Fotos y videos comparten la misma galería: primero las fotos (la primera
// sigue siendo la portada del catálogo) y al final los videos, que en las
// miniaturas se distinguen por el icono de play.
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

// Igual que el carrusel del inicio: los puntos de abajo permiten saltar a una
// vista, y al elegirla la fila de miniaturas se desplaza para mostrarla.
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

const MAIN_SIZES = '(min-width: 768px) 50vw, 100vw'

const copied = ref(false)

async function copyReference() {
  if (!product.value) return
  await navigator.clipboard.writeText(referenceMessage(product.value))
  copied.value = true
  setTimeout(() => (copied.value = false), 2500)
}
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 pb-16">
    <nav class="pt-6" aria-label="Migas de pan">
      <router-link
        :to="{ name: 'catalog' }"
        class="inline-flex min-h-11 items-center gap-2 font-semibold text-gold-600 hover:text-gold-500"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Volver al catálogo
      </router-link>
    </nav>

    <div v-if="product" class="mt-6 grid gap-8 md:grid-cols-2 md:items-start">
      <!-- min-w-0: sin esto la fila de miniaturas (que no se parte) empuja la
           columna del grid más allá de la pantalla en vez de hacer scroll. -->
      <div class="min-w-0">
        <div class="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-hope">
          <!-- El key fuerza a recrear el <video> al cambiar de vista: si no,
               el video anterior seguiría sonando debajo de la foto nueva. -->
          <!-- autoplay exige muted (los navegadores bloquean el audio no
               pedido); el control de volumen queda a mano para activarlo. -->
          <video
            v-if="activeMedia?.type === 'video'"
            :key="activeMedia.src"
            :src="activeMedia.src"
            controls
            autoplay
            muted
            playsinline
            preload="metadata"
            class="aspect-square w-full bg-ink object-contain"
            :aria-label="`${product.name} — video`"
          />
          <img
            v-else
            v-bind="imageProps(activeMedia?.src, MAIN_SIZES)"
            :alt="`${product.name} — vista ${activeIndex + 1}`"
            class="aspect-square w-full object-contain"
          />
          <span
            v-if="product.available === false"
            class="absolute left-3 top-3 rounded-full bg-ink/90 px-4 py-1.5 text-sm font-semibold text-cream"
          >
            Agotado
          </span>
        </div>

        <!-- Fila desplazable: con 5+ miniaturas (fotos + video) ya no caben en
             un teléfono y desbordaban la página entera. Los ml-auto/mr-auto de
             los extremos centran la fila cuando sobra espacio y se anulan
             solos cuando hay scroll. -->
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
            class="relative w-20 flex-none overflow-hidden rounded-xl bg-white ring-2 transition-all first:ml-auto last:mr-auto sm:w-24"
            :class="i === activeIndex ? 'ring-gold-500' : 'ring-transparent opacity-70 hover:opacity-100'"
            :aria-label="item.type === 'video' ? 'Ver video' : `Ver vista ${i + 1}`"
            :aria-pressed="i === activeIndex"
            @click="selectMedia(i)"
          >
            <!-- preload="metadata" basta para que el navegador pinte el primer
                 cuadro del video como miniatura, sin descargarlo entero. -->
            <video
              v-if="item.type === 'video'"
              :src="item.src"
              preload="metadata"
              muted
              tabindex="-1"
              class="pointer-events-none aspect-square w-full bg-ink object-contain"
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
              <svg viewBox="0 0 24 24" class="h-7 w-7 fill-cream drop-shadow-md">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          </button>
        </div>

        <!-- Puntos como los del carrusel del inicio (solo móvil, donde las
             miniaturas no caben todas): marcan la vista activa y permiten
             saltar directo a cualquiera. -->
        <div
          v-if="media.length > 1"
          class="mt-3 flex justify-center gap-2 sm:hidden"
          role="tablist"
          aria-label="Seleccionar vista del producto"
        >
          <button
            v-for="(item, i) in media"
            :key="item.src"
            type="button"
            role="tab"
            class="h-2 rounded-full transition-all"
            :class="i === activeIndex ? 'w-6 bg-gold-500' : 'w-2 bg-hope'"
            :aria-selected="i === activeIndex"
            :aria-label="item.type === 'video' ? 'Ver video' : `Ver vista ${i + 1}`"
            @click="selectMedia(i)"
          />
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div>
          <p v-if="categoryName" class="text-sm font-semibold uppercase tracking-wide text-gold-600">
            {{ categoryName }}
          </p>
          <h1 class="mt-1 font-display text-3xl font-bold text-ink sm:text-4xl">
            {{ product.name }}
          </h1>
          <p class="mt-1 text-sm text-ink-soft">Referencia: {{ product.id.toUpperCase() }}</p>
        </div>

        <p class="text-3xl font-bold text-gold-600">{{ displayPrice(product) }}</p>

        <p
          v-if="product.available === false"
          class="rounded-2xl bg-hope/60 px-4 py-3 text-sm text-ink-soft"
        >
          Este producto está agotado por el momento, pero escríbenos: podemos avisarte cuando vuelva
          a estar disponible. 💛
        </p>

        <p class="leading-relaxed text-ink-soft">{{ product.description }}</p>

        <div class="mt-2 rounded-2xl bg-hope/60 p-4">
          <p class="text-sm font-semibold text-ink">¿Te interesa? Pídelo por tu canal favorito:</p>

          <a
            v-if="whatsappLink(product)"
            :href="whatsappLink(product)"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 flex items-center justify-center gap-2 rounded-full bg-ink py-3.5 font-semibold text-gold-400 transition-colors hover:bg-gold-500 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true">
              <path
                d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.1-.3.2-.5v-.4c0-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.3 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"
              />
            </svg>
            Pedir por WhatsApp
          </a>
          <p v-if="whatsappLink(product)" class="mt-1.5 text-center text-xs text-ink-soft">
            El mensaje ya incluye el nombre y la referencia del producto. Solo presiona enviar.
          </p>

          <div v-if="instagramDmLink || facebookDmLink" class="mt-4 border-t border-hope pt-4">
            <p class="text-xs text-ink-soft">
              ¿Prefieres Instagram o Facebook? Ahí no podemos escribir el mensaje por ti:
              <strong>copia la referencia</strong> y pégala en el chat.
            </p>
            <div class="mt-3 flex flex-col gap-2">
              <button
                class="w-full rounded-full border-2 border-ink px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-gold-400"
                @click="copyReference"
              >
                {{ copied ? '✓ ¡Copiado!' : 'Copiar referencia' }}
              </button>
              <a
                v-if="instagramDmLink"
                :href="instagramDmLink"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full rounded-full border-2 border-ink px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-gold-400"
              >
                Hablar en Instagram
              </a>
              <a
                v-if="facebookDmLink"
                :href="facebookDmLink"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full rounded-full border-2 border-ink px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-gold-400"
              >
                Hablar en Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="py-20 text-center">
      <p class="text-ink-soft">No encontramos este producto.</p>
      <router-link
        :to="{ name: 'catalog' }"
        class="mt-4 inline-block rounded-full bg-ink px-8 py-3 font-semibold text-gold-400 hover:bg-gold-500 hover:text-ink"
      >
        Ir al catálogo
      </router-link>
    </div>
  </main>
</template>

<style scoped>
/* Igual que en Home.vue: el scroll de las miniaturas funciona, pero sin
   pintar la barra, que en móvil se ve tosca. */
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
