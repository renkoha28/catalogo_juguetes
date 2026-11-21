<script setup>
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'

defineProps({
  product: { type: Object, required: true },
})

const { displayPrice, mainImage } = useCatalog()

const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw'
</script>

<template>
  <router-link
    :to="{ name: 'product', params: { id: product.id } }"
    class="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-hope transition-shadow hover:shadow-lg"
  >
    <div class="relative aspect-square overflow-hidden bg-transparent">
      <img
        v-bind="imageProps(mainImage(product), CARD_SIZES)"
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
    <div class="flex flex-1 flex-col gap-1 p-3 sm:p-4">
      <h3 class="font-display text-base font-semibold text-ink sm:text-lg">{{ product.name }}</h3>
      <p class="line-clamp-2 text-sm text-ink-soft">{{ product.shortDescription }}</p>
      <p class="mt-auto pt-2 text-lg font-bold text-gold-600">{{ displayPrice(product) }}</p>
      <span
        class="mt-1 w-full rounded-full bg-ink py-2.5 text-center text-sm font-semibold text-gold-400 transition-colors group-hover:bg-gold-500 group-hover:text-ink"
      >
        Ver detalles
      </span>
    </div>
  </router-link>
</template>
