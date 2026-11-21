import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Catalog from '../pages/Catalog.vue'
import ProductDetail from '../pages/ProductDetail.vue'
import About from '../pages/About.vue'
import Social from '../pages/Social.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/catalogo', name: 'catalog', component: Catalog },
    { path: '/catalogo/:id', name: 'product', component: ProductDetail, props: true },
    { path: '/nosotros', name: 'about', component: About },
    { path: '/redes', name: 'social', component: Social },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

export default router
