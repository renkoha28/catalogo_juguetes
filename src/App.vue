<script setup>
import { watchEffect } from 'vue'
import { useCatalog } from './composables/useCatalog'
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
import FloatingWhatsApp from './components/FloatingWhatsApp.vue'

const { business } = useCatalog()

// El título de la pestaña sale del JSON, igual que el resto del contenido.
watchEffect(() => {
  if (business.value.name) document.title = business.value.name
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-cream">
    <NavBar />
    <div class="flex-1">
      <router-view />
    </div>
    <Footer />
    <FloatingWhatsApp />
  </div>
</template>
