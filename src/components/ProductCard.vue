<script setup>
import { computed } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'

const props = defineProps({
  product: { type: Object, required: true },
  sizes: {
    type: String,
    default: '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
  },
})

const { displayPrice, mainImage, categories } = useCatalog()

const categoryName = computed(
  () => categories.value.find((c) => c.id === props.product.category)?.name ?? ''
)
const soldOut = computed(() => props.product.available === false)
</script>

<template>
  <router-link
    :to="{ name: 'product', params: { id: product.id } }"
    class="group flex h-full flex-col overflow-hidden rounded-2xl bg-noir-700 ring-1 ring-gold-500/15 transition duration-300 hover:-translate-y-1 hover:ring-gold-400/50 hover:shadow-[0_18px_40px_-18px_rgb(192_38_45/0.6)]"
  >
    <!-- Panel claro: casi todas las fotos de producto vienen con fondo blanco. -->
    <div class="relative aspect-square overflow-hidden bg-satin">
      <img
        v-bind="imageProps(mainImage(product), sizes)"
        :alt="product.name"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        :class="{ 'opacity-50 grayscale': soldOut }"
      />
      <span
        v-if="soldOut"
        class="absolute left-2 top-2 rounded-full bg-noir/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose"
      >
        Agotado
      </span>
      <span
        v-else-if="product.featured"
        class="absolute left-2 top-2 rounded-full bg-wine-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose"
      >
        Favorito
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-1 p-3 sm:p-4">
      <div class="flex items-baseline justify-between gap-2 text-[10px] uppercase">
        <p class="truncate font-semibold tracking-[0.2em] text-wine-400">{{ categoryName }}</p>
        <p class="shrink-0 tracking-wider text-mist">{{ product.id.toUpperCase() }}</p>
      </div>
      <h3 class="line-clamp-2 font-display text-base italic leading-snug text-rose sm:text-lg">
        {{ product.name }}
      </h3>
      <p class="mt-auto whitespace-nowrap pt-2 text-[15px] font-semibold text-gold-300 sm:text-lg">
        {{ displayPrice(product) }}
      </p>
    </div>
  </router-link>
</template>
