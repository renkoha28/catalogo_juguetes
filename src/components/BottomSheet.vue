<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

// Bloquea el scroll del fondo mientras la hoja está abierta, ya que se
// presenta por encima de todo el contenido.
watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-backdrop">
      <div v-if="modelValue" class="fixed inset-0 z-50 bg-ink/60" @click="close" />
    </Transition>
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-cream shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-label="title || undefined"
      >
        <div class="mx-auto mt-3 mb-4 h-1.5 w-12 rounded-full bg-hope" />
        <div class="px-2 pb-4">
          <h2 v-if="title" class="mb-4 px-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            {{ title }}
          </h2>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop-enter-active,
.sheet-backdrop-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
