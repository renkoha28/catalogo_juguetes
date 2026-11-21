import { computed, ref } from 'vue'
import { SOCIAL_ICONS, SOCIAL_LABELS, socialHref, waNumber } from '../assets/socialIcons'
import businessData from '../../content/business.json'
import aboutData from '../../content/about.json'
import socialData from '../../content/social.json'
import settingsData from '../../content/settings.json'
import currenciesData from '../../content/currencies.json'

// Los productos y categorías viven como un archivo JSON por entrada en
// content/; Vite los incorpora al build, así que agregar o quitar archivos
// no requiere tocar código (y en dev se recargan solos).
const categoryModules = import.meta.glob('../../content/categories/*.json', { eager: true })
const productModules = import.meta.glob('../../content/products/*.json', { eager: true })

const categoriesData = Object.values(categoryModules)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

// La categoría va implícita en el prefijo de la referencia (PC-001 → clásicas).
// El panel la escribe en el JSON al guardar, pero si un producto llega sin ella
// —creado a mano o guardado antes de este cambio— se deduce del prefijo.
const categoryByPrefix = new Map(
  categoriesData
    .filter((category) => category.prefix)
    .map((category) => [String(category.prefix).toUpperCase(), category.id])
)

const categoryOf = (product) =>
  product.category ||
  categoryByPrefix.get(String(product.id ?? '').split('-')[0].toUpperCase()) ||
  ''

const productsData = Object.values(productModules)
  .map((m) => ({ ...m.default, category: categoryOf(m.default) }))
  // Un producto sin referencia no puede ni enlazarse (la ruta /catalogo/:id
  // la exige y vue-router revienta con el parámetro vacío): mejor dejarlo
  // fuera del catálogo que tumbar la página entera por un JSON a medias.
  .filter((product) => product.id)
  .sort((a, b) => a.id.localeCompare(b.id))

// Monedas (content/currencies.json, editable en el panel): el precio de cada
// producto se escribe a mano solo en la moneda base; las demás se calculan con
// su tasa de cambio, así nunca quedan desactualizadas entre sí.
const BASE_CURRENCY = {
  code: 'COP',
  symbol: '$',
  name: 'Pesos colombianos',
  ...(currenciesData.base ?? {}),
}

// Una moneda sin tasa (o con tasa 0) haría dividir por cero: se ignora en vez
// de mostrar precios en infinito.
const CONVERTED_CURRENCIES = (currenciesData.others ?? []).filter(
  (currency) => currency?.code && Number(currency.rate) > 0
)

const currenciesList = [BASE_CURRENCY, ...CONVERTED_CURRENCIES]

// Moneda seleccionada: compartida por toda la app y recordada en el navegador.
const storedCurrency = localStorage.getItem('currency')
const selectedCurrency = ref(
  currenciesList.some((c) => c.code === storedCurrency) ? storedCurrency : BASE_CURRENCY.code
)

function setCurrency(code) {
  selectedCurrency.value = code
  localStorage.setItem('currency', code)
}

// `rate` es "cuántos pesos vale 1 unidad de esa moneda" (si el dólar está a
// 4.100, rate = 4100), que es como se habla del cambio en la calle.
// `roundTo` evita precios como "US$ 56,83": redondea al múltiplo indicado.
const convert = (amountInBase, currency) => {
  if (currency.code === BASE_CURRENCY.code) return amountInBase
  const rate = Number(currency.rate)
  if (!(rate > 0)) return null
  const step = Number(currency.roundTo) > 0 ? Number(currency.roundTo) : 1
  return Math.round(amountInBase / rate / step) * step
}

// Los decimales salen del redondeo: roundTo 1 → 0 decimales, 0.01 → 2.
const decimalsFor = (currency) => {
  const step = String(Number(currency.roundTo) > 0 ? currency.roundTo : 1)
  const dot = step.indexOf('.')
  return dot === -1 ? 0 : step.length - dot - 1
}

export function useCatalog() {
  const business = computed(() => businessData)
  const about = computed(() => aboutData)
  const social = computed(() => socialData)
  const categories = computed(() => categoriesData)
  const products = computed(() => productsData)
  const settings = computed(() => settingsData)
  const currencies = computed(() => currenciesList)

  // El precio siempre se guarda en la moneda base. El `prices.COP` de atrás es
  // el esquema viejo: los productos creados en el panel antes de este cambio
  // (o los que llegan del CMS sin migrar) se siguen viendo bien.
  const priceInBase = (product) => {
    const amount = product?.price ?? product?.prices?.[BASE_CURRENCY.code]
    return Number.isFinite(Number(amount)) ? Number(amount) : null
  }

  // Precio ya convertido a la moneda que eligió la visitante, listo para pintar:
  // "$420.000 COP" o "≈ US$105 USD" (el ≈ porque es una conversión, el cobro
  // real se hace en la moneda base).
  const displayPrice = (product) => {
    const amount = priceInBase(product)
    if (amount == null) return ''

    const currency =
      currenciesList.find((c) => c.code === selectedCurrency.value) ?? BASE_CURRENCY
    const converted = convert(amount, currency)
    if (converted == null) return ''

    const decimals = currency.code === BASE_CURRENCY.code ? 0 : decimalsFor(currency)
    const formatted = converted.toLocaleString('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    const prefix = currency.code === BASE_CURRENCY.code ? '' : '≈ '

    return `${prefix}${currency.symbol ?? '$'}${formatted} ${currency.code}`
  }

  const mainImage = (product) => product?.images?.[0] ?? product?.image ?? ''

  // "Peluca Ejemplo 1 (Ref: p001)" — así la dueña identifica el producto exacto.
  const productRef = (product) => `${product.name} (Ref: ${product.id.toUpperCase()})`

  const referenceMessage = (product) => {
    const template = settings.value.referenceMessage ?? 'Hola, me interesa: {product}'
    return template.replace('{product}', productRef(product))
  }

  const whatsappLink = (product) => {
    const phone = waNumber(social.value.whatsapp)
    if (!phone) return null
    const message = product
      ? (settings.value.whatsappMessage ?? 'Hola, me interesa: {product}').replace(
          '{product}',
          productRef(product)
        )
      : (settings.value.whatsappGeneralMessage ??
        'Hola, me gustaría recibir ayuda para encontrar el producto ideal para mí.')
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  // La ubicación tiene un solo campo: business.locationUrl (Negocio → Enlace de
  // Google Maps). Antes el pie de página lo leía de ahí y el icono del mapa de
  // social.maps, así que al cambiar uno el otro seguía apuntando al sitio viejo.
  // El social.maps antiguo se sigue aceptando por si queda algún JSON sin migrar,
  // pero ya no se edita desde el panel.
  const locationUrl = computed(() => business.value.locationUrl || social.value.maps || '')

  // Cada canal dice de dónde sale su valor: los perfiles y el WhatsApp viven en
  // social.json, y lo que es un dato del negocio (ubicación, teléfono, correo)
  // en business.json, que es donde la dueña espera editarlo. Declararlo así
  // evita excepciones escondidas dentro del bucle, y de paso el orden de los
  // iconos queda a la vista: es el de esta lista.
  const CHANNEL_SOURCES = [
    ['instagram', () => social.value.instagram],
    ['facebook', () => social.value.facebook],
    ['tiktok', () => social.value.tiktok],
    ['whatsapp', () => social.value.whatsapp],
    ['maps', () => locationUrl.value],
    ['website', () => social.value.website],
    ['phone', () => business.value.phone],
    ['email', () => business.value.email],
  ]

  // Los canales que se pintan como iconos (Inicio y página de Contacto), armados
  // una sola vez para que ambas pantallas muestren exactamente los mismos enlaces.
  const socialChannels = computed(() =>
    CHANNEL_SOURCES.map(([key, read]) => ({ key, value: read() }))
      .filter((channel) => channel.value)
      .map(({ key, value }) => ({
        key,
        href: socialHref(key, value),
        label: SOCIAL_LABELS[key],
        icon: SOCIAL_ICONS[key],
      }))
  )

  // Instagram y Facebook permiten abrir el chat directo, pero no pre-llenar el
  // mensaje; por eso el detalle de producto ofrece "copiar referencia".
  const instagramDmLink = computed(() =>
    social.value.instagramUser ? `https://ig.me/m/${social.value.instagramUser}` : null
  )
  const facebookDmLink = computed(() =>
    social.value.facebookUser ? `https://m.me/${social.value.facebookUser}` : null
  )

  return {
    business,
    about,
    social,
    categories,
    products,
    settings,
    currencies,
    selectedCurrency,
    setCurrency,
    displayPrice,
    mainImage,
    productRef,
    referenceMessage,
    whatsappLink,
    locationUrl,
    socialChannels,
    instagramDmLink,
    facebookDmLink,
  }
}
