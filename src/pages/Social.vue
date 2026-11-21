<script setup>
import { computed } from 'vue'
import { useCatalog } from '../composables/useCatalog'

const { socialChannels, business } = useCatalog()

const DESCRIPTIONS = {
  instagram: 'Síguenos y mira los nuevos estilos',
  facebook: 'Únete a nuestra comunidad',
  tiktok: 'Videos, tips y transformaciones',
  whatsapp: 'Escríbenos, respondemos rápido',
  maps: 'Visítanos en nuestra ubicación',
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
  <main class="mx-auto max-w-4xl px-4 pb-16">
    <h1 class="pt-8 text-center font-display text-3xl font-bold text-ink sm:text-4xl">Contacto</h1>
    <p class="mx-auto mt-2 max-w-xl text-center text-ink-soft">
      Todos nuestros pedidos se hacen fuera de la página: elige tu canal favorito y escríbenos.
      ¡Nos encantará atenderte!
    </p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <a
        v-for="channel in channels"
        :key="channel.key"
        :href="channel.href"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-hope transition-shadow hover:shadow-lg"
      >
        <span
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-gold-400 transition-colors group-hover:bg-gold-500 group-hover:text-ink"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7 fill-current" aria-hidden="true">
            <path :d="channel.icon" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="block font-display text-lg font-semibold text-ink">{{ channel.label }}</span>
          <span class="block truncate text-sm text-ink-soft">{{ channel.description }}</span>
        </span>
      </a>
    </div>

    <section v-if="business.hours?.length" class="mt-12" aria-label="Horarios de atención">
      <h2 class="text-center font-display text-2xl font-bold text-ink">Horarios de atención</h2>
      <ul class="mx-auto mt-4 max-w-sm space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-hope">
        <li
          v-for="entry in business.hours"
          :key="entry.days"
          class="flex justify-between gap-4 text-sm text-ink-soft"
        >
          <span>{{ entry.days }}</span>
          <span class="font-semibold text-ink">{{ entry.open }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>
