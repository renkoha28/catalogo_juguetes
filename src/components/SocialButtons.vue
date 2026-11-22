<script setup>
import { useCatalog } from '../composables/useCatalog'

const { socialChannels: buttons } = useCatalog()
</script>

<template>
  <ul v-if="buttons.length" class="flex flex-wrap justify-center gap-3" aria-label="Redes sociales y contacto">
    <li v-for="btn in buttons" :key="btn.key">
      <a
        :href="btn.href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="btn.label"
        class="flex h-12 w-12 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40 transition duration-200 hover:scale-110 hover:bg-wine-700 hover:text-gold-200 hover:ring-wine-500"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true">
          <path :d="btn.icon" />
        </svg>
      </a>
    </li>
  </ul>
</template>
