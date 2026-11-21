/**
 * Widget "reference" para Sveltia CMS.
 *
 * La referencia de un producto (PC-001) ya no se escribe: se ASIGNA sola.
 * Al crear un producto se elige solo la categoría; el widget busca el número
 * más alto en uso en esa categoría y asigna el siguiente (PC-018 → PC-019).
 * En un producto ya guardado la referencia se muestra bloqueada: es la llave
 * del catálogo (la que las clientas mencionan al pedir) y cambiarla rompería
 * pedidos anotados y enlaces; quien la tenga que cambiar de verdad, que sea
 * David tocando el JSON.
 *
 * Antes se permitía teclear el código (incluso con letras, PC-001-B) y eso
 * generaba referencias inconsistentes; las viejas con sufijo se conservan tal
 * cual, pero ya no se pueden crear nuevas.
 *
 * Se apoya en tres APIs públicas de Sveltia (compatibles con Decap CMS):
 *   - CMS.registerWidget      → el control de la referencia
 *   - isValid() del control   → bloquea el guardado si quedó repetida
 *   - CMS.registerEventListener('preSave') → escribe `category` según el prefijo
 *
 * Los datos salen de /admin/catalog-index.json (lo genera
 * scripts/generate-admin-index.mjs en cada build) más las referencias creadas
 * en esta sesión del navegador.
 */
;(function () {
  'use strict'

  var h = window.h
  var createClass = window.createClass
  var CMS = window.CMS

  if (!CMS || !h || !createClass) {
    console.error('[referencia] Sveltia CMS no está cargado; el widget no se registró.')
    return
  }

  var INDEX_URL = '/admin/catalog-index.json'
  var SESSION_KEY = 'catalogo.referencias-creadas'
  var PRODUCTS_COLLECTION = 'productos'

  var index = { categories: [], products: [] }
  var indexPromise = null
  var indexError = null

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL, { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status)
          return res.json()
        })
        .then(function (data) {
          index = {
            categories: (data.categories || []).filter(function (c) {
              return c && c.prefix
            }),
            products: data.products || [],
          }
          return index
        })
        .catch(function (err) {
          indexError = err
          console.error('[referencia] No se pudo leer ' + INDEX_URL + ':', err)
          return index
        })
    }
    return indexPromise
  }

  // Referencias guardadas en esta sesión: el índice se regenera al desplegar,
  // así que sin esto crear dos productos seguidos asignaría el mismo número.
  function sessionRefs() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY)
      var parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      return []
    }
  }

  function rememberRef(entry) {
    if (!entry || !entry.id) return
    try {
      var refs = sessionRefs().filter(function (r) {
        return normalize(r.id) !== normalize(entry.id)
      })
      refs.push(entry)
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(refs.slice(-200)))
    } catch (err) {
      /* localStorage lleno o bloqueado: no es crítico */
    }
  }

  function normalize(value) {
    return String(value == null ? '' : value)
      .trim()
      .toUpperCase()
  }

  // Mapa referencia → producto, con lo publicado y lo creado en esta sesión.
  //
  // Se indexa por el id y TAMBIÉN por el slug (el nombre del archivo). Casi
  // siempre coinciden, porque el CMS guarda cada producto en <id>.json, pero
  // pueden separarse si a un producto ya publicado se le cambió el id a mano.
  // Mirar las dos formas cuesta un bucle y evita pisar un producto entero.
  function knownRefs() {
    var map = {}
    var all = index.products.concat(sessionRefs())
    all.forEach(function (p) {
      if (p && p.slug) map[normalize(p.slug)] = p
    })
    all.forEach(function (p) {
      if (p && p.id) map[normalize(p.id)] = p
    })
    return map
  }

  // "PC-001" → { prefix: 'PC', code: '001' }. El código puede llevar guiones
  // (PC-001-B, herencia de cuando se escribía a mano), por eso se corta solo
  // en el primero.
  function splitRef(value) {
    var raw = String(value == null ? '' : value).trim()
    var dash = raw.indexOf('-')
    if (dash === -1) return { prefix: '', code: raw }
    return { prefix: raw.slice(0, dash), code: raw.slice(dash + 1) }
  }

  function buildRef(prefix, code) {
    var clean = normalize(code).replace(/^-+/, '')
    if (!prefix || !clean) return ''
    return normalize(prefix) + '-' + clean
  }

  // Siguiente código libre para un prefijo: el número más alto en uso + 1,
  // a 3 cifras (PC-018 → 019). No se rellenan huecos a propósito: si PC-007
  // se borró, ese número pudo quedar anotado por clientas o en publicaciones
  // viejas, y reusarlo apuntaría a otra peluca.
  function nextCode(prefix) {
    var want = normalize(prefix)
    var max = 0
    index.products.concat(sessionRefs()).forEach(function (p) {
      ;[p && p.id, p && p.slug].forEach(function (ref) {
        if (!ref) return
        var parts = splitRef(normalize(ref))
        if (normalize(parts.prefix) !== want) return
        if (!/^\d+$/.test(parts.code)) return
        var num = parseInt(parts.code, 10)
        if (num > max) max = num
      })
    })
    return String(max + 1).padStart(3, '0')
  }

  function categoryForRef(value) {
    var prefix = normalize(splitRef(value).prefix)
    if (!prefix) return ''
    var match = index.categories.filter(function (c) {
      return normalize(c.prefix) === prefix
    })[0]
    return match ? match.id : ''
  }

  var COLORS = {
    ok: 'var(--sui-success-foreground-color, #3fb950)',
    error: 'var(--sui-error-foreground-color, #f85149)',
    muted: 'var(--sui-secondary-foreground-color, #9ca3af)',
  }

  var ReferenceControl = createClass({
    displayName: 'ReferenceControl',

    getInitialState: function () {
      var parsed = splitRef(this.props.value)
      return {
        ready: false,
        prefix: parsed.prefix,
        code: parsed.code,
        refs: {},
        categories: [],
      }
    },

    componentDidMount: function () {
      var self = this
      // Referencia con la que se abrió el campo: si existe, el producto ya
      // estaba guardado y la referencia queda bloqueada.
      this.originalRef = normalize(this.props.value)

      loadIndex().then(function (data) {
        if (self.unmounted) return
        var parsed = splitRef(self.props.value)
        var prefix = parsed.prefix
        var code = parsed.code

        // Producto nuevo: primera categoría y su siguiente número libre,
        // asignados sin que haya que teclear nada.
        if (!self.originalRef && data.categories.length) {
          prefix = data.categories[0].prefix
          code = nextCode(prefix)
        }

        self.setState(
          {
            ready: true,
            categories: data.categories,
            refs: knownRefs(),
            prefix: prefix,
            code: code,
          },
          function () {
            // La asignación también se escribe en el valor del campo: si se
            // guarda tal cual, queda la referencia asignada y no un vacío.
            self.commit(prefix, code)
          }
        )
      })
    },

    componentWillUnmount: function () {
      this.unmounted = true
    },

    // Sveltia espera el contrato de Decap: `false` o { error: { message } }
    // invalidan el campo y bloquean el guardado.
    isValid: function () {
      var status = this.status()
      if (status.state === 'taken') {
        return { error: { message: status.message } }
      }
      return true
    },

    status: function () {
      if (!this.state.ready) {
        return { state: 'loading', message: indexError ? 'No se pudo verificar' : 'Verificando…' }
      }
      var ref = buildRef(this.state.prefix, this.state.code)
      if (!ref) {
        return { state: 'empty', message: 'Crea primero una categoría para poder asignar referencia.' }
      }
      if (ref === this.originalRef) {
        return { state: 'current', message: 'La referencia no se cambia después de creado el producto.' }
      }
      // Red de seguridad por si el índice quedó viejo y la asignación choca
      // con algo creado desde otro navegador.
      var owner = this.state.refs[ref]
      if (owner) {
        return {
          state: 'taken',
          message: 'La referencia ' + ref + ' ya es de «' + (owner.name || 'otro producto') + '».',
          owner: owner,
        }
      }
      return { state: 'free', message: ref + ' queda asignada para este producto.' }
    },

    commit: function (prefix, code) {
      var next = buildRef(prefix, code)
      if (next !== String(this.props.value == null ? '' : this.props.value)) {
        this.props.onChange(next)
      }
    },

    // Cambiar de categoría reasigna el número: el siguiente libre de ESA
    // categoría, rescaneando lo conocido por si se creó algo en otra pestaña.
    onCategoryChange: function (event) {
      var prefix = event.target.value
      var code = nextCode(prefix)
      this.setState({ prefix: prefix, code: code, refs: knownRefs() })
      this.commit(prefix, code)
    },

    renderStatus: function () {
      var status = this.status()
      var color = COLORS.muted
      var icon = ''

      if (status.state === 'free') {
        color = COLORS.ok
        icon = '✅ '
      } else if (status.state === 'taken') {
        color = COLORS.error
        icon = '❌ '
      } else if (status.state === 'current') {
        icon = '🔒 '
      }

      var children = [h('span', { key: 'text' }, icon + status.message)]

      if (status.state === 'taken' && status.owner && status.owner.slug) {
        children.push(
          h(
            'a',
            {
              key: 'link',
              href: '#/collections/' + PRODUCTS_COLLECTION + '/entries/' + status.owner.slug,
              style: { marginLeft: '8px', color: 'inherit' },
            },
            'Ver ese producto'
          )
        )
      }

      return h(
        'p',
        {
          key: 'status',
          style: {
            margin: '8px 0 0',
            fontSize: '13px',
            color: color,
            minHeight: '18px',
          },
          role: 'status',
        },
        children
      )
    },

    renderPreview: function () {
      return h(
        'p',
        {
          key: 'preview',
          style: {
            margin: '10px 0 0',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: 'var(--sui-font-family-monospace, monospace)',
          },
        },
        buildRef(this.state.prefix, this.state.code) || '—'
      )
    },

    render: function () {
      var self = this
      var state = this.state

      var controlStyle = {
        padding: '6px 8px',
        borderRadius: '4px',
        border: '1px solid var(--sui-primary-border-color, #4b5563)',
        background: 'var(--sui-textbox-background-color, #1f2023)',
        color: 'var(--sui-primary-foreground-color, #e5e7eb)',
        fontSize: '14px',
      }

      if (indexError && state.ready) {
        // Sin índice no se puede contar ni verificar: modo de emergencia con
        // la referencia completa a mano (pensado para David, no para la dueña).
        return h('div', { className: this.props.classNameWrapper }, [
          h(
            'p',
            { key: 'warn', style: { margin: '0 0 8px', color: COLORS.error, fontSize: '13px' } },
            'No se pudo cargar la lista de referencias; escribe la referencia completa a mano.'
          ),
          h('input', {
            key: 'raw',
            id: this.props.forID,
            type: 'text',
            value: this.props.value || '',
            style: Object.assign({}, controlStyle, { width: '100%' }),
            onChange: function (event) {
              self.props.onChange(normalize(event.target.value))
            },
          }),
        ])
      }

      // Producto ya guardado: la referencia se muestra, no se toca.
      if (this.originalRef) {
        return h('div', { className: this.props.classNameWrapper }, [
          this.renderPreview(),
          this.renderStatus(),
        ])
      }

      // Producto nuevo: solo se elige la categoría; el número va solo.
      return h('div', { className: this.props.classNameWrapper }, [
        h(
          'select',
          {
            key: 'category',
            id: this.props.forID,
            value: state.prefix,
            disabled: !state.ready,
            onChange: this.onCategoryChange,
            style: Object.assign({}, controlStyle, { width: '100%', maxWidth: '320px' }),
            'aria-label': 'Categoría',
          },
          state.categories.map(function (category) {
            return h(
              'option',
              { key: category.prefix, value: category.prefix },
              category.name + ' (' + category.prefix + '-)'
            )
          })
        ),
        this.renderPreview(),
        this.renderStatus(),
      ])
    },
  })

  CMS.registerWidget('reference', ReferenceControl)

  // La categoría no se pide aparte: se deduce del prefijo de la referencia y se
  // escribe en el JSON al guardar, para que el catálogo la siga leyendo igual.
  CMS.registerEventListener({
    name: 'preSave',
    handler: function (context) {
      var entry = context && context.entry
      if (!entry || typeof entry.get !== 'function') return undefined
      if (entry.get('collection') !== PRODUCTS_COLLECTION) return undefined

      var data = entry.get('data')
      if (!data || typeof data.get !== 'function') return undefined

      var category = categoryForRef(data.get('id'))
      if (!category) return undefined

      return data.set('category', category)
    },
  })

  // Tras guardar, la referencia queda anotada para que el próximo producto de
  // esta misma sesión reciba el número siguiente (el índice todavía no se ha
  // regenerado).
  CMS.registerEventListener({
    name: 'postSave',
    handler: function (context) {
      var entry = context && context.entry
      if (!entry || typeof entry.get !== 'function') return undefined
      if (entry.get('collection') !== PRODUCTS_COLLECTION) return undefined

      var data = entry.get('data')
      if (!data || typeof data.get !== 'function') return undefined

      rememberRef({
        id: data.get('id'),
        name: data.get('name'),
        slug: entry.get('slug'),
      })
      return undefined
    },
  })

  loadIndex()
  CMS.init()
})()
