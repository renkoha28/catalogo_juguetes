<script setup>
import { computed, ref } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'
import ProductCard from '../components/ProductCard.vue'
import SocialButtons from '../components/SocialButtons.vue'

const { business, categories, products, whatsappLink } = useCatalog()

// Hasta 4 productos marcados como "Destacado" en el panel (mismo límite que
// la página Destacados del admin); si no hay ninguno marcado, se muestran los
// primeros del catálogo para no dejar vacío el inicio.
const FEATURED_LIMIT = 4

const featured = computed(() => {
  const marked = products.value.filter((p) => p.featured)
  return (marked.length ? marked : products.value).slice(0, FEATURED_LIMIT)
})

const countByCategory = computed(() => {
  const counts = {}
  products.value.forEach((p) => (counts[p.category] = (counts[p.category] ?? 0) + 1))
  return counts
})

const countLabel = (n) => (!n ? 'Muy pronto' : n === 1 ? '1 producto' : `${n} productos`)

const highlights = computed(() => business.value.highlights ?? [])

// Cinta animada: los títulos de las promesas, repetidos para que el bucle
// no tenga huecos (la animación desplaza exactamente la mitad).
const tickerItems = computed(() => {
  const titles = highlights.value.map((h) => h.title).filter(Boolean)
  if (!titles.length) return []
  const row = Array.from({ length: Math.ceil(8 / titles.length) }, () => titles).flat()
  return [...row, ...row]
})

// Iconos de las promesas, por posición (candado, paquete, chat).
const PROMISE_ICONS = [
  'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3',
  'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10',
  'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
]

// Carrusel de favoritos en móvil: punto activo según el scroll.
const scrollerRef = ref(null)
const itemEls = []
const activeIndex = ref(0)

function setItemRef(el, i) {
  if (el) itemEls[i] = el
}

function onScroll() {
  const scroller = scrollerRef.value
  if (!scroller) return
  const center = scroller.scrollLeft + scroller.clientWidth / 2
  let closest = 0
  let closestDist = Infinity
  itemEls.forEach((el, i) => {
    if (!el) return
    const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  })
  activeIndex.value = closest
}

function goToIndex(i) {
  const el = itemEls[i]
  const scroller = scrollerRef.value
  if (!el || !scroller) return
  scroller.scrollTo({
    left: el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2,
    behavior: 'smooth',
  })
}
</script>

<template>
  <main>
    <!-- ================================================== Portada -->
    <header class="bg-ember relative isolate overflow-hidden">
      <!-- Portada opcional (Información general → Negocio): si hay foto, va
           de fondo, oscurecida para que el texto siga leyéndose. -->
      <template v-if="business.cover">
        <img
          v-bind="imageProps(business.cover, '100vw')"
          alt=""
          class="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
        />
        <div class="absolute inset-0 -z-10 bg-gradient-to-b from-noir/40 via-noir/60 to-noir" />
      </template>

      <div class="mx-auto flex min-h-[calc(100svh-4rem)] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <img :src="business.logo" :alt="`Logo de ${business.name}`" class="animate-glow h-48 w-48 sm:h-60 sm:w-60" />
        <h1 class="sr-only">{{ business.name }}</h1>
        <p v-if="business.slogan" class="mt-8 font-display text-5xl italic leading-tight text-gold-sheen sm:text-6xl">
          {{ business.slogan }}
        </p>
        <p v-if="business.description" class="mx-auto mt-5 max-w-xl leading-relaxed text-mist">
          {{ business.description }}
        </p>
        <div class="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <router-link :to="{ name: 'catalog' }" class="btn-gold">Explorar el catálogo</router-link>
          <a
            v-if="whatsappLink()"
            :href="whatsappLink()"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-outline"
          >
            Asesoría discreta
          </a>
        </div>
      </div>
    </header>

    <!-- ================================================== Cinta -->
    <div
      v-if="tickerItems.length"
      class="overflow-hidden border-y border-gold-500/30 bg-gradient-to-r from-wine-900 via-wine-700 to-wine-900 py-3"
      aria-hidden="true"
    >
      <div class="animate-marquee flex w-max items-center gap-6 whitespace-nowrap">
        <template v-for="(item, i) in tickerItems" :key="i">
          <span class="text-xs font-semibold uppercase tracking-[0.3em] text-gold-200">{{ item }}</span>
          <span class="text-gold-400">✦</span>
        </template>
      </div>
    </div>

    <!-- ================================================== Categorías -->
    <section v-if="categories.length" class="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="cats-title">
      <p class="text-center text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Categorías</p>
      <h2 id="cats-title" class="mt-2 text-center font-display text-4xl italic text-rose">Explora tus deseos</h2>

      <div class="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <router-link
          v-for="category in categories"
          :key="category.id"
          :to="{ name: 'catalog', query: { categoria: category.id } }"
          class="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-noir-700 p-4 ring-1 ring-gold-500/15 transition duration-300 hover:ring-gold-400/60 sm:aspect-[4/3]"
        >
          <img
            v-if="category.image"
            v-bind="imageProps(category.image, '(min-width: 1024px) 25vw, 50vw')"
            alt=""
            loading="lazy"
            class="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <!-- Sin foto: brillo rojo y la inicial grande en dorado. -->
          <template v-else>
            <div
              class="absolute inset-0 -z-20 bg-[radial-gradient(80%_70%_at_70%_20%,var(--color-wine-700),transparent_70%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
            />
            <span
              class="absolute -right-2 -top-6 -z-10 font-display text-[9rem] italic leading-none text-gold-400/15 transition-transform duration-500 group-hover:scale-110"
              aria-hidden="true"
            >
              {{ category.name.charAt(0) }}
            </span>
          </template>
          <div class="absolute inset-0 -z-10 bg-gradient-to-t from-noir via-noir/40 to-transparent" />

          <h3 class="font-display text-xl italic leading-tight text-rose sm:text-2xl">{{ category.name }}</h3>
          <p v-if="category.description" class="mt-1 line-clamp-2 text-xs text-mist">{{ category.description }}</p>
          <p class="mt-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">
            {{ countLabel(countByCategory[category.id]) }}
            <span class="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
          </p>
        </router-link>
      </div>
    </section>

    <!-- ================================================== Favoritos -->
    <section v-if="featured.length" class="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="fav-title">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Lo más deseado</p>
          <h2 id="fav-title" class="mt-2 font-display text-4xl italic text-rose">Favoritos</h2>
        </div>
        <router-link
          :to="{ name: 'catalog' }"
          class="shrink-0 pb-1 text-sm font-semibold text-gold-300 underline decoration-gold-500/40 underline-offset-4 hover:text-gold-200"
        >
          Ver todo →
        </router-link>
      </div>

      <!-- Móvil: carrusel con snap -->
      <div class="mt-8 sm:hidden">
        <div
          ref="scrollerRef"
          class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2"
          @scroll="onScroll"
        >
          <div
            v-for="(product, i) in featured"
            :key="product.id"
            :ref="(el) => setItemRef(el, i)"
            class="w-[72%] flex-none snap-center [scroll-snap-stop:always]"
          >
            <ProductCard :product="product" sizes="72vw" />
          </div>
        </div>
        <div
          v-if="featured.length > 1"
          class="mt-5 flex justify-center gap-2"
          role="tablist"
          aria-label="Seleccionar producto favorito"
        >
          <button
            v-for="(product, i) in featured"
            :key="product.id"
            type="button"
            role="tab"
            class="h-1.5 rounded-full transition-all"
            :class="i === activeIndex ? 'w-7 bg-gold-400' : 'w-1.5 bg-noir-600'"
            :aria-selected="i === activeIndex"
            :aria-label="`Ver ${product.name}`"
            @click="goToIndex(i)"
          />
        </div>
      </div>

      <!-- Tablet/escritorio -->
      <div class="mt-8 hidden gap-5 sm:grid sm:grid-cols-2 md:grid-cols-4">
        <ProductCard v-for="product in featured" :key="product.id" :product="product" />
      </div>
    </section>

    <!-- ================================================== Promesas -->
    <section v-if="highlights.length" class="mx-auto max-w-6xl px-4 pt-20" aria-label="Nuestra promesa">
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="(item, i) in highlights"
          :key="item.title"
          class="rounded-2xl bg-noir-800 p-6 text-center ring-1 ring-gold-500/15"
        >
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-wine-800/60 text-gold-300 ring-1 ring-wine-500/50">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path :d="PROMISE_ICONS[i % PROMISE_ICONS.length]" />
            </svg>
          </span>
          <h3 class="mt-4 font-display text-xl italic text-gold-300">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-mist">{{ item.text }}</p>
        </div>
      </div>
    </section>

    <!-- ================================================== Llamado final -->
    <section class="px-4 pb-20 pt-20">
      <div class="bg-ember relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-6 py-14 text-center ring-1 ring-wine-600/50">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Sin pena, sin tabúes</p>
        <h2 class="mt-3 font-display text-4xl italic text-gold-sheen sm:text-5xl">¿Tienes dudas?</h2>
        <p class="mx-auto mt-4 max-w-md text-mist">
          Pregúntanos lo que quieras. Te ayudamos a encontrar lo ideal para ti, con total discreción.
        </p>
        <a
          v-if="whatsappLink()"
          :href="whatsappLink()"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-gold mt-8"
        >
          Escríbenos por WhatsApp
        </a>
        <div class="mt-8"><SocialButtons /></div>
      </div>
    </section>
  </main>
</template>
