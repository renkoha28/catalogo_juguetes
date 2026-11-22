<script setup>
import { useCatalog } from '../composables/useCatalog'
import { imageProps } from '../utils/images'

const { about, business } = useCatalog()
</script>

<template>
  <main class="pb-20">
    <header class="bg-ember px-4 pb-12 pt-14 text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Nosotros</p>
      <h1 class="mx-auto mt-2 max-w-2xl font-display text-5xl italic leading-tight text-gold-sheen">
        {{ about.title }}
      </h1>
    </header>

    <div class="mx-auto mt-4 grid max-w-5xl gap-10 px-4 md:grid-cols-5 md:items-center">
      <div class="md:col-span-2">
        <img
          v-if="about.image"
          v-bind="imageProps(about.image, '(min-width: 768px) 40vw, 100vw')"
          :alt="`Fotografía de ${business.name}`"
          class="w-full rounded-3xl object-cover ring-1 ring-gold-500/25"
        />
        <!-- Sin foto: el emblema con su brillo, para no dejar el hueco. -->
        <div v-else class="flex justify-center">
          <img :src="business.logo" alt="" class="animate-glow h-56 w-56" />
        </div>
      </div>
      <div class="space-y-5 leading-relaxed text-mist md:col-span-3">
        <p
          v-for="(paragraph, i) in about.story"
          :key="i"
          :class="i === 0 ? 'font-display text-2xl italic leading-snug text-rose' : ''"
        >
          {{ paragraph }}
        </p>
      </div>
    </div>

    <section v-if="about.values?.length" class="mx-auto mt-16 max-w-5xl px-4" aria-label="Nuestros valores">
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="(value, i) in about.values"
          :key="value.title"
          class="rounded-2xl bg-noir-800 p-6 ring-1 ring-gold-500/15"
        >
          <p class="font-display text-4xl italic text-wine-500">0{{ i + 1 }}</p>
          <h2 class="mt-2 font-display text-2xl italic text-gold-300">{{ value.title }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-mist">{{ value.text }}</p>
        </div>
      </div>
    </section>

    <div class="mt-14 text-center">
      <router-link :to="{ name: 'catalog' }" class="btn-gold">Conoce el catálogo</router-link>
    </div>
  </main>
</template>
