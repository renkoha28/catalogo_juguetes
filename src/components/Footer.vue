<script setup>
import { useCatalog } from '../composables/useCatalog'
import { dialNumber } from '../assets/socialIcons'
import SocialButtons from './SocialButtons.vue'

const { business, locationUrl, currencies, selectedCurrency, setCurrency } = useCatalog()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative overflow-hidden bg-noir-800 px-4 pb-24 pt-14 text-rose sm:pb-12">
    <div class="gold-rule absolute inset-x-0 top-0" aria-hidden="true" />
    <div
      class="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-wine-800/40 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative mx-auto max-w-5xl">
      <div class="flex flex-col items-center text-center">
        <img :src="business.logo" alt="" class="h-20 w-20" />
        <p class="mt-3 font-display text-3xl italic text-gold-sheen">{{ business.name }}</p>
        <p v-if="business.slogan" class="mt-1 text-sm text-mist">{{ business.slogan }}</p>
        <div class="mt-6"><SocialButtons /></div>
      </div>

      <div class="mt-12 grid gap-10 text-center sm:grid-cols-3 sm:text-left">
        <div v-if="business.address || locationUrl">
          <h2 class="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Ubicación</h2>
          <p class="mt-3 text-sm leading-relaxed text-mist">{{ business.address }}</p>
          <a
            v-if="locationUrl"
            :href="locationUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 inline-block text-sm font-semibold text-gold-300 underline decoration-gold-500/40 underline-offset-4 hover:text-gold-200"
          >
            Ver en Google Maps
          </a>
        </div>

        <div v-if="business.phone || business.email">
          <h2 class="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Contacto</h2>
          <ul class="mt-3 space-y-1.5 text-sm">
            <li v-if="business.phone">
              <a :href="`tel:${dialNumber(business.phone)}`" class="text-gold-300 hover:text-gold-200">
                {{ business.phone }}
              </a>
            </li>
            <li v-if="business.email">
              <a :href="`mailto:${business.email}`" class="break-words text-gold-300 hover:text-gold-200">
                {{ business.email }}
              </a>
            </li>
          </ul>
        </div>

        <div v-if="business.hours?.length">
          <h2 class="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Horarios</h2>
          <ul class="mt-3 space-y-1.5 text-sm text-mist">
            <li
              v-for="entry in business.hours"
              :key="entry.days"
              class="flex justify-center gap-4 sm:justify-between sm:max-w-xs"
            >
              <span>{{ entry.days }}</span>
              <span class="font-medium text-rose">{{ entry.open }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div
        v-if="currencies.length > 1"
        class="mt-12 flex items-center justify-center gap-3"
        role="group"
        aria-label="Moneda de los precios"
      >
        <span class="text-sm text-mist">Ver precios en:</span>
        <div class="flex overflow-hidden rounded-full ring-1 ring-gold-500/50">
          <button
            v-for="currency in currencies"
            :key="currency.code"
            class="px-4 py-1.5 text-sm font-semibold transition-colors"
            :class="
              selectedCurrency === currency.code
                ? 'bg-gold-400 text-noir'
                : 'text-gold-300 hover:bg-gold-400/10'
            "
            :aria-pressed="selectedCurrency === currency.code"
            :title="currency.name"
            @click="setCurrency(currency.code)"
          >
            {{ currency.code }}
          </button>
        </div>
      </div>

      <div class="gold-rule mt-12" aria-hidden="true" />
      <p class="mt-6 text-center text-xs text-mist">
        <span class="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-wine-500 text-[10px] font-bold text-wine-400">18+</span>
        Sitio para mayores de edad · © {{ year }} {{ business.name }}
      </p>
    </div>
  </footer>
</template>
