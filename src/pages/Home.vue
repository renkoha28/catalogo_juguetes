<script setup>
import { computed, ref } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import BusinessHeader from '../components/BusinessHeader.vue'
import SocialButtons from '../components/SocialButtons.vue'
import ProductCard from '../components/ProductCard.vue'

const { products } = useCatalog()

// Hasta 4 productos marcados como "Destacado" en el admin; si no hay ninguno
// marcado, se muestran los primeros del catálogo para no dejar vacío el inicio.
const FEATURED_LIMIT = 4

const featured = computed(() => {
  const marked = products.value.filter((p) => p.featured)
  return (marked.length ? marked : products.value).slice(0, FEATURED_LIMIT)
})

// Carrusel horizontal (solo mobile): calcula el punto activo según el scroll
// y permite saltar a una tarjeta tocando su punto.
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
    const itemCenter = el.offsetLeft + el.offsetWidth / 2
    const dist = Math.abs(itemCenter - center)
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
    <BusinessHeader />
    <SocialButtons />

    <section class="mx-auto max-w-6xl px-4 pb-16" aria-label="Productos destacados">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="font-display text-2xl font-bold text-ink sm:text-3xl">Destacados</h2>
        <router-link
          :to="{ name: 'catalog' }"
          class="text-sm font-semibold text-gold-600 underline underline-offset-4 hover:text-gold-500"
        >
          Ver todo el catálogo →
        </router-link>
      </div>

      <!-- Mobile: carrusel horizontal con snap; una tarjeta por fila ocupaba
           demasiado alto en pantallas pequeñas. -->
      <div class="mt-6 sm:hidden">
        <div
          ref="scrollerRef"
          class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2"
          @scroll="onScroll"
        >
          <div
            v-for="(product, i) in featured"
            :key="product.id"
            :ref="(el) => setItemRef(el, i)"
            class="w-[78%] flex-none snap-center [scroll-snap-stop:always]"
          >
            <ProductCard :product="product" />
          </div>
        </div>

        <div
          v-if="featured.length > 1"
          class="mt-4 flex justify-center gap-2"
          role="tablist"
          aria-label="Seleccionar producto destacado"
        >
          <button
            v-for="(product, i) in featured"
            :key="product.id"
            type="button"
            role="tab"
            class="h-2 rounded-full transition-all"
            :class="i === activeIndex ? 'w-6 bg-gold-500' : 'w-2 bg-hope'"
            :aria-selected="i === activeIndex"
            :aria-label="`Ver ${product.name}`"
            @click="goToIndex(i)"
          />
        </div>
      </div>

      <!-- Tablet/desktop: grid como antes -->
      <div class="mt-6 hidden gap-6 sm:grid sm:grid-cols-2 md:grid-cols-4">
        <ProductCard v-for="product in featured" :key="product.id" :product="product" />
      </div>

      <div class="mt-10 text-center">
        <router-link
          :to="{ name: 'catalog' }"
          class="inline-block rounded-full bg-ink px-8 py-3.5 font-semibold text-gold-400 shadow-md transition-colors hover:bg-gold-500 hover:text-ink"
        >
          Explorar el catálogo completo
        </router-link>
      </div>
    </section>
  </main>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
