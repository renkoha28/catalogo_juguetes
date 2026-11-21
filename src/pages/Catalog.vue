<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import CategoryFilter from '../components/CategoryFilter.vue'
import ProductThumbnail from '../components/ProductThumbnail.vue'

const route = useRoute()
const router = useRouter()
const { categories, products } = useCatalog()

const activeCategory = computed(() => route.query.categoria ?? 'todas')

const filteredProducts = computed(() =>
  activeCategory.value === 'todas'
    ? products.value
    : products.value.filter((p) => p.category === activeCategory.value)
)

function selectCategory(id) {
  router.replace({ query: id === 'todas' ? {} : { categoria: id } })
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 pb-16">
    <h1 class="pt-8 text-center font-display text-3xl font-bold text-ink sm:text-4xl">Catálogo</h1>
    <p class="mx-auto mt-2 max-w-xl pb-6 text-center text-ink-soft">
      Explora por categoría y toca cualquier producto para ver sus detalles.
    </p>

    <CategoryFilter :categories="categories" :active="activeCategory" @select="selectCategory" />

    <div class="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
      <ProductThumbnail v-for="product in filteredProducts" :key="product.id" :product="product" />
    </div>

    <p v-if="!filteredProducts.length" class="mt-10 text-center text-ink-soft">
      Pronto agregaremos productos a esta categoría. 💛
    </p>
  </main>
</template>
