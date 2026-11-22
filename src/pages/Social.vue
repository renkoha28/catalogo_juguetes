<script setup>
import { computed } from 'vue'
import { useCatalog } from '../composables/useCatalog'

const { socialChannels, business } = useCatalog()

const DESCRIPTIONS = {
  instagram: 'Novedades y lanzamientos',
  facebook: 'Únete a nuestra comunidad',
  tiktok: 'Tips, reseñas y mucho más',
  whatsapp: 'Pedidos y asesoría discreta',
  maps: 'Visítanos en la tienda',
  website: 'Conoce más sobre nosotros',
  phone: 'Llámanos directamente',
  email: 'Escríbenos un correo',
}

const channels = computed(() =>
  socialChannels.value.map((channel) => ({
    ...channel,
    description: DESCRIPTIONS[channel.key],
  }))
)
</script>

<template>
  <main class="pb-20">
    <header class="bg-ember px-4 pb-10 pt-14 text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Contacto</p>
      <h1 class="mt-2 font-display text-5xl italic text-gold-sheen">Hablemos</h1>
      <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mist">
        Todos los pedidos se hacen por nuestros canales, con total discreción. Elige el que prefieras
        y escríbenos.
      </p>
    </header>

    <div class="mx-auto mt-6 grid max-w-4xl gap-3 px-4 sm:grid-cols-2">
      <a
        v-for="channel in channels"
        :key="channel.key"
        :href="channel.href"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex items-center gap-4 rounded-2xl bg-noir-800 p-4 ring-1 ring-gold-500/15 transition duration-300 hover:ring-gold-400/50"
      >
        <span
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-wine-800/60 text-gold-300 ring-1 ring-wine-500/50 transition-colors group-hover:bg-wine-600 group-hover:text-gold-200"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6 fill-current" aria-hidden="true">
            <path :d="channel.icon" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="block font-display text-xl italic text-rose">{{ channel.label }}</span>
          <span class="block truncate text-sm text-mist">{{ channel.description }}</span>
        </span>
        <span class="ml-auto text-gold-400 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
      </a>
    </div>

    <section v-if="business.hours?.length" class="mx-auto mt-14 max-w-sm px-4" aria-label="Horarios de atención">
      <h2 class="text-center font-display text-3xl italic text-rose">Horarios</h2>
      <ul class="mt-4 space-y-2 rounded-2xl bg-noir-800 p-5 ring-1 ring-gold-500/15">
        <li v-for="entry in business.hours" :key="entry.days" class="flex justify-between gap-4 text-sm text-mist">
          <span>{{ entry.days }}</span>
          <span class="font-semibold text-gold-300">{{ entry.open }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>
