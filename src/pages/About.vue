<script setup>
import { useCatalog } from '../composables/useCatalog'

const { about, business } = useCatalog()
</script>

<template>
  <main class="mx-auto max-w-4xl px-4 pb-16">
    <h1 class="pt-8 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
      {{ about.title }}
    </h1>

    <div class="mt-8 grid gap-8 md:grid-cols-5 md:items-start">
      <div class="md:col-span-2">
        <img
          v-if="about.image"
          :src="about.image"
          :alt="`Fotografía de ${business.name}`"
          class="w-full rounded-3xl shadow-md ring-1 ring-hope"
        />
      </div>
      <div class="space-y-4 leading-relaxed text-ink-soft md:col-span-3">
        <p v-for="(paragraph, i) in about.story" :key="i">{{ paragraph }}</p>
      </div>
    </div>

    <section v-if="about.values?.length" class="mt-12" aria-label="Nuestros valores">
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="value in about.values"
          :key="value.title"
          class="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-hope"
        >
          <h2 class="font-display text-xl font-semibold text-gold-600">{{ value.title }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-soft">{{ value.text }}</p>
        </div>
      </div>
    </section>

    <div class="mt-12 text-center">
      <router-link
        :to="{ name: 'catalog' }"
        class="inline-block rounded-full bg-ink px-8 py-3.5 font-semibold text-gold-400 shadow-md transition-colors hover:bg-gold-500 hover:text-ink"
      >
        Conoce nuestro catálogo
      </router-link>
    </div>
  </main>
</template>
