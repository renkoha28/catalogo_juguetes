<script setup>
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'

const props = defineProps({
  categories: { type: Array, required: true },
  active: { type: String, required: true },
})

const emit = defineEmits(['select'])

const options = computed(() => [
  { value: 'todas', label: 'Todas' },
  ...props.categories.map((c) => ({ value: c.id, label: c.name })),
])

const activeLabel = computed(
  () => options.value.find((opt) => opt.value === props.active)?.label ?? ''
)

const sheetOpen = ref(false)

function choose(value) {
  emit('select', value)
  sheetOpen.value = false
}
</script>

<template>
  <div class="sticky top-0 z-10 -mx-4 bg-cream/95 px-4 py-3 backdrop-blur">
    <!-- Mobile: botón que abre una hoja inferior con las opciones -->
    <div class="sm:hidden">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-full border-2 border-ink bg-cream px-5 py-2.5 text-sm font-semibold text-ink"
        :aria-expanded="sheetOpen"
        @click="sheetOpen = true"
      >
        {{ activeLabel }}
        <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M5 7l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <BottomSheet v-model="sheetOpen" title="Filtrar por categoría">
        <ul role="listbox" aria-label="Categorías">
          <li v-for="opt in options" :key="opt.value">
            <button
              type="button"
              role="option"
              :aria-selected="opt.value === active"
              class="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium transition-colors"
              :class="opt.value === active ? 'bg-hope text-ink' : 'text-ink-soft hover:bg-hope/60'"
              @click="choose(opt.value)"
            >
              {{ opt.label }}
              <svg
                v-if="opt.value === active"
                viewBox="0 0 20 20"
                class="h-5 w-5 text-gold-600"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
              >
                <path d="M4 10l4 4 8-8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </li>
        </ul>
      </BottomSheet>
    </div>

    <!-- Tablet/desktop: pestañas horizontales como antes -->
    <div class="hidden sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1" role="tablist" aria-label="Categorías">
      <button
        role="tab"
        :aria-selected="active === 'todas'"
        class="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
        :class="active === 'todas' ? 'bg-ink text-gold-400' : 'bg-hope text-ink-soft hover:bg-gold-100'"
        @click="$emit('select', 'todas')"
      >
        Todas
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        role="tab"
        :aria-selected="active === category.id"
        class="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
        :class="active === category.id ? 'bg-ink text-gold-400' : 'bg-hope text-ink-soft hover:bg-gold-100'"
        @click="$emit('select', category.id)"
      >
        {{ category.name }}
      </button>
    </div>
  </div>
</template>
