<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useCatalog } from '../composables/useCatalog'

// Aviso de mayoría de edad. Se activa/desactiva desde el panel
// (Información general → Ajustes) y se recuerda en el navegador para no
// preguntarlo en cada visita.
const STORAGE_KEY = 'pk2-mayor-de-edad'

const { business, settings } = useCatalog()

const readConfirmed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'si'
  } catch {
    return false
  }
}

const open = ref(settings.value.ageGate === true && !readConfirmed())
const declined = ref(false)

function confirm() {
  try {
    localStorage.setItem(STORAGE_KEY, 'si')
  } catch {
    /* navegación privada: se vuelve a preguntar la próxima vez */
  }
  open.value = false
}

watch(open, (isOpen) => (document.body.style.overflow = isOpen ? 'hidden' : ''), {
  immediate: true,
})
onBeforeUnmount(() => (document.body.style.overflow = ''))
</script>

<template>
  <Transition leave-active-class="transition duration-300" leave-to-class="opacity-0">
    <div
      v-if="open"
      class="bg-ember fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div class="w-full max-w-sm text-center">
        <img :src="business.logo" alt="" class="animate-glow mx-auto h-36 w-36" />
        <p class="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-wine-400">Solo adultos</p>
        <h2 id="age-gate-title" class="mt-2 font-display text-3xl italic text-gold-sheen">
          ¿Eres mayor de 18 años?
        </h2>

        <template v-if="!declined">
          <p class="mt-4 text-sm leading-relaxed text-mist">
            Este sitio muestra productos para adultos. Para entrar, confirma que eres mayor de edad.
          </p>
          <div class="mt-8 flex flex-col gap-3">
            <button type="button" class="btn-gold" @click="confirm">Sí, soy mayor de 18</button>
            <button type="button" class="btn-outline" @click="declined = true">No, salir</button>
          </div>
        </template>
        <p v-else class="mt-6 text-sm leading-relaxed text-mist">
          Lo sentimos: este contenido es solo para mayores de edad. Ya puedes cerrar esta pestaña.
        </p>
      </div>
    </div>
  </Transition>
</template>
