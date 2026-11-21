// Rutas SVG (viewBox 0 0 24 24) y etiquetas de cada canal soportado.
// El orden en que se pintan los iconos NO sale de aquí: se declara en
// CHANNEL_SOURCES (composables/useCatalog.js), junto con el origen de cada uno.
export const SOCIAL_ICONS = {
  instagram:
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM7 3.8a3.2 3.2 0 0 0-3.2 3.2v10a3.2 3.2 0 0 0 3.2 3.2h10a3.2 3.2 0 0 0 3.2-3.2V7a3.2 3.2 0 0 0-3.2-3.2zM12 7a5 5 0 1 1 0 10 5 5 0 1 1 0-10zM12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 1 0 0-6.4zM17.4 5.4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 1 1 0-2.4z',
  facebook:
    'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z',
  tiktok:
    'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.3V2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.3 6.3 0 1 0 5.4 6.2V8.9a8.1 8.1 0 0 0 4.6 1.4V6.9c-.3 0-.5-.1-.8-.2z',
  whatsapp:
    'M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.1-.3.2-.5v-.4c0-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.3 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3z',
  maps: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
  website:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.9 9h-3a15.4 15.4 0 0 0-1.2-5.5A8 8 0 0 1 19.9 11zM12 4c.9 1.2 1.7 3.6 1.9 7h-3.8c.2-3.4 1-5.8 1.9-7zM8.3 5.5A15.4 15.4 0 0 0 7.1 11h-3a8 8 0 0 1 4.2-5.5zM4.1 13h3c.1 2 .5 3.9 1.2 5.5A8 8 0 0 1 4.1 13zM12 20c-.9-1.2-1.7-3.6-1.9-7h3.8c-.2 3.4-1 5.8-1.9 7zm3.7-1.5c.7-1.6 1.1-3.5 1.2-5.5h3a8 8 0 0 1-4.2 5.5z',
  phone:
    'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z',
  email:
    'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
}

export const SOCIAL_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  maps: 'Cómo llegar',
  website: 'Sitio web',
  phone: 'Llamar',
  email: 'Correo',
}

// El teléfono se escribe como se lee ("+58 414 0363322") para poder mostrarlo
// tal cual en el pie de página; los enlaces lo necesitan sin espacios. tel:
// admite el prefijo +, wa.me solo acepta dígitos.
export function dialNumber(value) {
  const raw = String(value ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return raw.startsWith('+') ? `+${digits}` : digits
}

export function waNumber(value) {
  return String(value ?? '').replace(/\D/g, '')
}

// Convierte el valor guardado en el JSON en un enlace clicable.
export function socialHref(key, value) {
  if (key === 'whatsapp') return `https://wa.me/${waNumber(value)}`
  if (key === 'phone') return `tel:${dialNumber(value)}`
  if (key === 'email') return `mailto:${value}`
  return value
}
