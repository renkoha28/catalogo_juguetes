<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'

const { business } = useCatalog()
const route = useRoute()

const links = [
  { to: { name: 'home' }, label: 'Inicio' },
  { to: { name: 'catalog' }, label: 'Catálogo' },
  { to: { name: 'about' }, label: 'Nosotros' },
  { to: { name: 'social' }, label: 'Contacto' },
]

const menuOpen = ref(false)

// Cualquier navegación cierra el menú móvil.
watch(() => route.fullPath, () => (menuOpen.value = false))
</script>

<template>
  <nav class="sticky top-0 z-40 bg-ink shadow-md" aria-label="Navegación principal">
    <!-- El panel móvil se posiciona en absoluto para superponerse al contenido
         sin empujarlo, sin importar la posición del scroll. -->
    <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
      <router-link :to="{ name: 'home' }" class="flex min-w-0 items-center">
        <img
          v-if="business.navbarLogo"
          :src="business.navbarLogo"
          :alt="business.name"
          class="h-9 w-auto max-w-[200px] object-contain sm:h-10 sm:max-w-[220px]"
        />
        <template v-else>
          <img :src="business.logo" :alt="`Logo de ${business.name}`" class="h-9 w-9 rounded-full" />
          <span class="ml-2 hidden truncate font-display text-lg text-gold-400 min-[400px]:block sm:text-xl">
            {{ business.name }}
          </span>
        </template>
      </router-link>

      <!-- Enlaces en pantallas medianas y grandes -->
      <div class="hidden shrink-0 gap-2 md:flex">
        <router-link
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="rounded-full px-4 py-2 text-sm font-semibold text-cream transition-colors hover:text-gold-300"
          exact-active-class="bg-gold-500 !text-ink"
        >
          {{ link.label }}
        </router-link>
      </div>

      <!-- Hamburguesa en móvil -->
      <button
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gold-400 transition-colors hover:bg-ink-soft md:hidden"
        :aria-expanded="menuOpen"
        aria-controls="mobile-menu"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <template v-if="menuOpen">
            <path d="M6 6l12 12M18 6L6 18" />
          </template>
          <template v-else>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </template>
        </svg>
      </button>
    </div>

    <!-- Panel móvil desplegable -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="menuOpen"
        id="mobile-menu"
        class="absolute inset-x-0 top-full border-t border-ink-soft bg-ink shadow-lg md:hidden"
      >
        <div class="flex flex-col gap-1 px-4 py-3">
          <router-link
            v-for="link in links"
            :key="link.label"
            :to="link.to"
            class="rounded-xl px-4 py-3 text-base font-semibold text-cream transition-colors hover:bg-ink-soft hover:text-gold-300"
            exact-active-class="bg-gold-500 !text-ink"
          >
            {{ link.label }}
          </router-link>
        </div>
      </div>
    </Transition>
  </nav>
</template>
