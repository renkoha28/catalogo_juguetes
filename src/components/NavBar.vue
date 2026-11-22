<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'

const { business, socialChannels, whatsappLink } = useCatalog()
const route = useRoute()

const links = [
  { to: { name: 'home' }, label: 'Inicio' },
  { to: { name: 'catalog' }, label: 'Catálogo' },
  { to: { name: 'about' }, label: 'Nosotros' },
  { to: { name: 'social' }, label: 'Contacto' },
]

const menuOpen = ref(false)

// Cualquier navegación cierra el menú.
watch(() => route.fullPath, () => (menuOpen.value = false))

// El menú móvil ocupa toda la pantalla: el fondo no debe desplazarse debajo.
watch(menuOpen, (open) => (document.body.style.overflow = open ? 'hidden' : ''))
onBeforeUnmount(() => (document.body.style.overflow = ''))

// "Catálogo" sigue marcado al ver un producto (/catalogo/VB-001).
const isActive = (link) =>
  link.to.name === 'catalog'
    ? route.name === 'catalog' || route.name === 'product'
    : route.name === link.to.name
</script>

<template>
  <nav class="sticky top-0 z-50" aria-label="Navegación principal">
    <!-- El desenfoque va en una capa aparte: un backdrop-filter en el <nav>
         volvería "fixed" relativo al nav y el menú móvil no cubriría la pantalla. -->
    <div class="absolute inset-0 -z-10 bg-noir/85 backdrop-blur-md" aria-hidden="true" />
    <div class="relative z-50 mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
      <router-link :to="{ name: 'home' }" class="flex min-w-0 items-center gap-2.5">
        <img
          v-if="business.navbarLogo"
          :src="business.navbarLogo"
          :alt="business.name"
          class="h-10 w-auto max-w-[200px] object-contain"
        />
        <template v-else>
          <img :src="business.logo" alt="" class="h-11 w-11 shrink-0" />
          <span class="truncate font-display text-2xl italic text-gold-sheen">{{ business.name }}</span>
        </template>
      </router-link>

      <!-- Pantallas medianas y grandes -->
      <div class="hidden items-center gap-1 md:flex">
        <router-link
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="relative px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors"
          :class="isActive(link) ? 'text-gold-300' : 'text-mist hover:text-rose'"
        >
          {{ link.label }}
          <span
            v-if="isActive(link)"
            class="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent"
            aria-hidden="true"
          />
        </router-link>
      </div>

      <button
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40 transition-colors hover:bg-gold-400/10 md:hidden"
        :aria-expanded="menuOpen"
        aria-controls="mobile-menu"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path v-if="menuOpen" d="M6 6l12 12M18 6L6 18" />
          <path v-else d="M4 8h16M8 16h12" />
        </svg>
      </button>
    </div>
    <div class="gold-rule" aria-hidden="true" />

    <!-- Menú móvil: pantalla completa, con el brillo rojo del logo. -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="menuOpen"
        id="mobile-menu"
        class="bg-ember fixed inset-0 z-40 flex flex-col overflow-y-auto px-8 pb-10 pt-24 md:hidden"
      >
        <ul class="flex flex-col gap-2">
          <li v-for="(link, i) in links" :key="link.label">
            <router-link
              :to="link.to"
              class="flex items-baseline gap-4 py-2 font-display text-4xl italic transition-colors"
              :class="isActive(link) ? 'text-gold-sheen' : 'text-rose hover:text-gold-300'"
            >
              <span class="font-body text-xs not-italic tracking-widest text-wine-400">0{{ i + 1 }}</span>
              {{ link.label }}
            </router-link>
          </li>
        </ul>

        <div class="mt-auto pt-10">
          <a
            v-if="whatsappLink()"
            :href="whatsappLink()"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-gold w-full"
          >
            Escríbenos por WhatsApp
          </a>
          <ul v-if="socialChannels.length" class="mt-6 flex flex-wrap justify-center gap-3">
            <li v-for="channel in socialChannels" :key="channel.key">
              <a
                :href="channel.href"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="channel.label"
                class="flex h-11 w-11 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true"><path :d="channel.icon" /></svg>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </nav>
</template>
