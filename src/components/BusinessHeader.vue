<script setup>
import { useCatalog } from '../composables/useCatalog'

const { business } = useCatalog()
</script>

<template>
  <header class="relative">
    <div class="h-48 w-full overflow-hidden bg-ink sm:h-64 md:h-80">
      <img
        :src="business.cover"
        :alt="`Portada de ${business.name}`"
        class="h-full w-full object-cover"
      />
    </div>

    <div class="mx-auto max-w-3xl px-4 pt-8 text-center">
      <!-- El nombre visible ya está en el logo de la barra de navegación;
           este h1 oculto lo conserva para lectores de pantalla y SEO. -->
      <h1 class="sr-only">{{ business.name }}</h1>
      <p v-if="business.slogan" class="font-display text-xl font-medium text-gold-600 sm:text-2xl">
        {{ business.slogan }}
      </p>
      <p v-if="business.description" class="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-soft">
        {{ business.description }}
      </p>
    </div>
  </header>
</template>
