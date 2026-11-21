<script setup>
import { useCatalog } from '../composables/useCatalog'
import { dialNumber } from '../assets/socialIcons'

const { business, locationUrl, currencies, selectedCurrency, setCurrency } = useCatalog()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-ink px-4 py-10 text-cream">
    <div class="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-2 sm:text-left md:grid-cols-3">
      <div v-if="business.address || locationUrl">
        <h2 class="font-display text-lg font-semibold text-gold-400">Ubicación</h2>
        <p class="mt-2 text-sm leading-relaxed opacity-90">{{ business.address }}</p>
        <a
          v-if="locationUrl"
          :href="locationUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-block text-sm font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200"
        >
          Ver en Google Maps
        </a>
      </div>

      <div v-if="business.phone || business.email">
        <h2 class="font-display text-lg font-semibold text-gold-400">Contacto</h2>
        <ul class="mt-2 space-y-1 text-sm opacity-90">
          <li v-if="business.phone">
            <a
              :href="`tel:${dialNumber(business.phone)}`"
              class="font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200"
            >
              {{ business.phone }}
            </a>
          </li>
          <li v-if="business.email">
            <a
              :href="`mailto:${business.email}`"
              class="break-words font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200"
            >
              {{ business.email }}
            </a>
          </li>
        </ul>
      </div>

      <div v-if="business.hours?.length">
        <h2 class="font-display text-lg font-semibold text-gold-400">Horarios</h2>
        <ul class="mt-2 space-y-1 text-sm opacity-90">
          <li v-for="entry in business.hours" :key="entry.days" class="flex justify-between gap-4 sm:max-w-xs">
            <span>{{ entry.days }}</span>
            <span class="font-medium">{{ entry.open }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="currencies.length > 1"
      class="mt-10 flex items-center justify-center gap-3"
      role="group"
      aria-label="Moneda de los precios"
    >
      <span class="text-sm opacity-90">Ver precios en:</span>
      <div class="flex overflow-hidden rounded-full border border-gold-400">
        <button
          v-for="currency in currencies"
          :key="currency.code"
          class="px-4 py-1.5 text-sm font-semibold transition-colors"
          :class="
            selectedCurrency === currency.code
              ? 'bg-gold-500 text-ink'
              : 'text-gold-300 hover:bg-ink-soft'
          "
          :aria-pressed="selectedCurrency === currency.code"
          :title="currency.name"
          @click="setCurrency(currency.code)"
        >
          {{ currency.code }}
        </button>
      </div>
    </div>

    <p class="mt-8 text-center text-xs opacity-70">
      © {{ year }} {{ business.name }} · Hecho con 💛
    </p>
  </footer>
</template>
