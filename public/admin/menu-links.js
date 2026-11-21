/**
 * Enlaces propios en el menú del panel (/admin/): "Destacados" y "Subir fotos".
 *
 * Sveltia no permite agregar entradas propias a su menú de colecciones, así
 * que el enlace se inyecta en el DOM. El menú real (verificado contra el
 * bundle que sirve unpkg) es:
 *
 *   div[role=listbox] > div[role=group] > div.inner
 *     > div.sui.option > button[role=option][data-value="Productos"] …
 *
 * En vez de fabricar ese marcado a mano, se CLONA el item de una colección
 * existente (hereda las clases y estilos exactos de la versión de Sveltia que
 * toque), y se le cambian icono, texto y atributos. Un MutationObserver lo
 * re-inyecta si Sveltia vuelve a pintar el menú.
 *
 * El CMS se carga con versión fijada (index.html), pero al actualizarla el
 * marcado puede cambiar: si hay sesión iniciada y tras varios intentos el menú
 * no aparece, se recurre a botones flotantes para que estas páginas nunca
 * queden inalcanzables.
 */
;(function () {
  'use strict'

  var LINKS = [
    { label: 'Destacados', icon: 'star', href: '/admin/destacados.html', emoji: '⭐' },
    { label: 'Subir fotos', icon: 'add_photo_alternate', href: '/admin/fotos.html', emoji: '📷' },
  ]
  var MARKER = 'data-admin-link'
  // Nombres visibles de las colecciones de config.yml: sirven para encontrar
  // el menú sin depender de clases CSS generadas.
  var COLLECTION_LABELS = ['Productos', 'Categorías', 'Información general']
  // Iconos (Material Symbols: el nombre va como texto) de esas colecciones,
  // para cambiar solo el icono de la colección clonada y no otros (check).
  var COLLECTION_ICONS = ['sell', 'category', 'settings']

  var fallbackBox = null

  function findMenuButtons() {
    // Camino directo: los botones llevan data-value con el nombre visible.
    var buttons = COLLECTION_LABELS.map(function (label) {
      return document.querySelector('[role="option"][data-value="' + label + '"]')
    }).filter(Boolean)
    if (buttons.length) return buttons

    // Por si un Sveltia futuro quita data-value: mismo criterio, por texto.
    return Array.prototype.filter.call(
      document.querySelectorAll('[role="option"], a, button'),
      function (el) {
        var label = (el.getAttribute('data-value') || el.textContent || '').trim()
        return COLLECTION_LABELS.indexOf(label.replace(/\d+$/, '').trim()) !== -1
      }
    )
  }

  function allInjected() {
    return LINKS.every(function (link) {
      return document.querySelector('[' + MARKER + '="' + link.label + '"]')
    })
  }

  function injectMenuLinks() {
    if (allInjected()) return true
    // Si Sveltia repintó el menú a medias, se rehacen todos para mantener el orden.
    Array.prototype.forEach.call(document.querySelectorAll('[' + MARKER + ']'), function (el) {
      el.remove()
    })
    var ok = LINKS.every(injectMenuLink)
    if (ok && fallbackBox) {
      fallbackBox.remove()
      fallbackBox = null
    }
    return ok
  }

  function injectMenuLink(link) {
    var buttons = findMenuButtons()
    if (!buttons.length) return false

    // Mejor clonar un item NO seleccionado: el seleccionado lleva estados de
    // resaltado (aria-selected, icono check) que no queremos heredar.
    var source =
      buttons.filter(function (el) {
        return el.getAttribute('aria-selected') !== 'true' && !el.hasAttribute('aria-current')
      })[0] || buttons[0]

    // Cada botón vive envuelto en un div.option; clonar el envoltorio
    // conserva el espaciado del menú.
    var wrapper =
      source.parentElement && /\boption\b/.test(source.parentElement.className || '')
        ? source.parentElement
        : source
    var clone = wrapper.cloneNode(true)
    clone.setAttribute(MARKER, link.label)

    var button = clone.matches('[role="option"], a, button')
      ? clone
      : clone.querySelector('[role="option"], a, button') || clone
    button.removeAttribute('id')
    if (button.hasAttribute('aria-selected')) button.setAttribute('aria-selected', 'false')
    button.removeAttribute('aria-current')
    // El listbox de Sveltia maneja el foco de SUS items (tabindex -1); este es
    // ajeno a él, así que necesita ser enfocable por su cuenta.
    button.setAttribute('tabindex', '0')
    ;['value', 'data-value', 'data-label', 'data-search-value'].forEach(function (attr) {
      if (button.hasAttribute(attr)) button.setAttribute(attr, link.label)
    })

    // Texto, icono y contador de entradas (que aquí no aplica).
    var leaves = clone.querySelectorAll('*')
    Array.prototype.forEach.call(leaves, function (el) {
      if (el.children.length) return
      var text = (el.textContent || '').trim()
      if (COLLECTION_LABELS.indexOf(text) !== -1) el.textContent = link.label
      else if (COLLECTION_ICONS.indexOf(text) !== -1) el.textContent = link.icon
      else if (/^\d+$/.test(text)) el.remove()
    })

    if (button.tagName === 'A') button.setAttribute('href', link.href)
    button.addEventListener('click', function (event) {
      event.preventDefault()
      event.stopPropagation()
      window.location.assign(link.href)
    })

    wrapper.parentElement.appendChild(clone)
    return true
  }

  function isLoggedIn() {
    try {
      var user = JSON.parse(window.localStorage.getItem('sveltia-cms.user') || 'null')
      return !!(user && (user.token || user.backendName))
    } catch (err) {
      return false
    }
  }

  function addFallbackButtons() {
    if (fallbackBox || allInjected()) return
    fallbackBox = document.createElement('div')
    fallbackBox.style.cssText =
      'position:fixed;bottom:14px;left:14px;z-index:9999;display:flex;gap:8px;'
    LINKS.forEach(function (link) {
      var a = document.createElement('a')
      a.href = link.href
      a.textContent = link.emoji + ' ' + link.label
      a.style.cssText =
        'padding:8px 14px;border-radius:999px;background:#d4af37;color:#191512;' +
        'font:600 13px ui-sans-serif,system-ui,sans-serif;text-decoration:none;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.35);'
      fallbackBox.appendChild(a)
    })
    document.body.appendChild(fallbackBox)
  }

  // El observer queda activo siempre: si Sveltia vuelve a pintar el menú (al
  // pasar por Assets, por ejemplo) el clon desaparece y hay que reinyectarlo.
  // injectMenuLinks() es idempotente, así que repetirlo no duplica nada.
  new MutationObserver(injectMenuLinks).observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Respaldo: sesión iniciada y varios intentos sin encontrar el menú →
  // el marcado cambió; aparecen los botones flotantes (y se quitan solos si
  // la inyección al menú lo logra después).
  var failedAttempts = 0
  var watchdog = window.setInterval(function () {
    if (allInjected()) {
      window.clearInterval(watchdog)
      return
    }
    if (!isLoggedIn()) return
    failedAttempts += 1
    if (failedAttempts >= 5) {
      addFallbackButtons()
      window.clearInterval(watchdog)
    }
  }, 3000)

  injectMenuLinks()
})()
