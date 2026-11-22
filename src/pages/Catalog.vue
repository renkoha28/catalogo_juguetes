<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import ProductCard from '../components/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const { categories, products, whatsappLink } = useCatalog()

// La categoría vive en la URL (?categoria=vibradores): se puede compartir el
// enlace y el botón "atrás" vuelve al filtro anterior.
const activeCategory = computed(() => route.query.categoria ?? 'todas')

const options = computed(() => [
  { id: 'todas', name: 'Todo' },
  ...categories.value,
])

const activeInfo = computed(() => categories.value.find((c) => c.id === activeCategory.value) ?? null)

const filteredProducts = computed(() =>
  activeCategory.value === 'todas'
    ? products.value
    : products.value.filter((p) => p.category === activeCategory.value)
)

function selectCategory(id) {
  router.replace({ query: id === 'todas' ? {} : { categoria: id } })
}

// En móvil la fila de categorías se desplaza: la elegida se centra para que
// no quede escondida al llegar desde un enlace del inicio.
const chipStrip = ref(null)
function centerActiveChip() {
  const strip = chipStrip.value
  const chip = strip?.querySelector('[aria-selected="true"]')
  if (!strip || !chip) return
  strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
}
onMounted(centerActiveChip)
watch(activeCategory, () => nextTick(centerActiveChip))
</script>

<template>
  <main class="pb-20">
    <header class="bg-ember px-4 pb-8 pt-12 text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Colección</p>
      <h1 class="mt-2 font-display text-5xl italic text-gold-sheen">
        {{ activeInfo ? activeInfo.name : 'Catálogo' }}
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-sm text-mist">
        {{ activeInfo?.description || 'Toca cualquier producto para ver sus fotos, detalles y cómo pedirlo.' }}
      </p>
    </header>

    <!-- Filtro fijo bajo la barra de navegación (h-16 + filete). -->
    <div class="sticky top-[65px] z-30 border-b border-gold-500/15 bg-noir/90 backdrop-blur-md">
      <div
        ref="chipStrip"
        class="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3"
        role="tablist"
        aria-label="Categorías"
      >
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          role="tab"
          :aria-selected="activeCategory === option.id"
          class="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors"
          :class="
            activeCategory === option.id
              ? 'bg-gradient-to-b from-gold-300 to-gold-500 text-noir'
              : 'text-mist ring-1 ring-gold-500/25 hover:text-rose hover:ring-gold-400/60'
          "
          @click="selectCategory(option.id)"
        >
          {{ option.name }}
        </button>
      </div>
    </div>

    <div class="mx-auto max-w-6xl px-4">
      <p v-if="filteredProducts.length" class="mt-6 text-xs uppercase tracking-[0.2em] text-mist">
        {{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'producto' : 'productos' }}
      </p>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        <ProductCard v-for="product in filteredProducts" :key="product.id" :product="product" />
      </div>

      <div v-if="!filteredProducts.length" class="mx-auto mt-16 max-w-md text-center">
        <p class="font-display text-3xl italic text-gold-sheen">Muy pronto…</p>
        <p class="mt-3 text-sm leading-relaxed text-mist">
          Estamos preparando esta colección. Mientras tanto, pregúntanos: seguro tenemos algo para ti.
        </p>
        <a
          v-if="whatsappLink()"
          :href="whatsappLink()"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-outline mt-6"
        >
          Preguntar por WhatsApp
        </a>
      </div>
    </div>
  </main>
</template>
