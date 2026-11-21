<script setup>
import { useCatalog } from '../composables/useCatalog'

const { socialChannels: buttons } = useCatalog()
</script>

<template>
  <nav v-if="buttons.length" class="mx-auto max-w-3xl px-4 py-8" aria-label="Redes sociales y contacto">
    <ul class="mx-auto grid w-fit grid-cols-4 justify-items-center gap-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
      <li v-for="btn in buttons" :key="btn.key">
        <a
          :href="btn.href"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="btn.label"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-gold-400 shadow-md transition-transform hover:scale-110 hover:bg-gold-500 hover:text-ink sm:h-14 sm:w-14"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6 fill-current" aria-hidden="true">
            <path :d="btn.icon" />
          </svg>
        </a>
      </li>
    </ul>
  </nav>
</template>
