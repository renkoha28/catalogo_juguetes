import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      // En dev, Vite solo sirve archivos de public/ por ruta exacta; /admin
      // caería en el fallback SPA y el router lo redirige al inicio. En
      // producción (Cloudflare Pages) el índice de carpeta se resuelve solo.
      name: 'serve-admin-index',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/admin' || req.url === '/admin/') {
            req.url = '/admin/index.html'
          } else if (req.url === '/admin/destacados' || req.url === '/admin/destacados/') {
            req.url = '/admin/destacados.html'
          } else if (req.url === '/admin/fotos' || req.url === '/admin/fotos/') {
            req.url = '/admin/fotos.html'
          }
          next()
        })
      },
    },
  ],
})
