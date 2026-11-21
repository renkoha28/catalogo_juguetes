<script setup>
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'

defineProps({
  product: { type: Object, required: true },
})

const { mainImage } = useCatalog()

const THUMB_SIZES = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw'
</script>

<template>
  <router-link :to="{ name: 'product', params: { id: product.id } }" class="group block">
    <div class="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-hope">
      <img
        v-bind="imageProps(mainImage(product), THUMB_SIZES)"
        :alt="product.name"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        :class="{ 'opacity-60 grayscale': product.available === false }"
      />
      <span
        v-if="product.available === false"
        class="absolute left-2 top-2 rounded-full bg-ink/90 px-3 py-1 text-xs font-semibold text-cream"
      >
        Agotado
      </span>
    </div>
    <!-- truncate: si el nombre es largo se corta con puntos suspensivos para
         que la cuadrícula no se desalinee. -->
    <p class="mt-2 truncate px-1 text-center text-sm font-semibold text-ink-soft">
      {{ product.id.toUpperCase() }} - {{ product.name }}
    </p>
  </router-link>
</template>
