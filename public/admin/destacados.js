/**
 * Gestor de productos destacados (/admin/destacados.html).
 *
 * El inicio muestra hasta 4 productos con `featured: true`, pero en el panel
 * la única forma de cambiarlos era abrir producto por producto. Aquí se ven
 * todos juntos —foto, nombre, referencia y categoría— con una casilla para
 * marcar cuáles van destacados, y se guardan todos de una vez.
 *
 * No pasa por Sveltia: lee y escribe los JSON de content/products/ directo
 * con la API de GitHub, reutilizando la sesión que Sveltia deja en
 * localStorage ('sveltia-cms.user') al entrar a /admin/. Repo y rama se leen
 * de /admin/config.yml para no tener el dato dos veces.
 *
 * Todos los cambios van en UN solo commit (API de git data: tree→commit→ref),
 * así Cloudflare hace un único deploy en vez de uno por producto. Al guardar
 * se re-lee cada archivo desde GitHub y solo se cambia `featured`: si alguien
 * editó el precio desde el panel mientras esta página estaba abierta, esa
 * edición no se pisa.
 */
;(function () {
  'use strict'

  var PRODUCTS_DIR = 'content/products/'
  var CATEGORIES_DIR = 'content/categories/'
  var FEATURED_LIMIT = 4 // el mismo límite que src/pages/Home.vue
  var API = 'https://api.github.com'
  var PAT_KEY = 'catalogo.destacados-token'

  var repo = ''
  var branch = 'main'
  var token = ''

  // [{ path, id, name, image, category, featured, checked }]
  var products = []

  var $ = function (id) {
    return document.getElementById(id)
  }

  // ---------------------------------------------------------------- pantallas

  var SCREENS = ['screen-loading', 'screen-login', 'screen-error']

  function showScreen(id) {
    SCREENS.forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id)
    })
    var showList = id === 'list'
    $('product-list').classList.toggle('hidden', !showList)
    $('savebar').classList.toggle('hidden', !showList)
  }

  function showError(message) {
    $('error-message').textContent = message
    showScreen('screen-error')
  }

  // ------------------------------------------------------------------- sesión

  function findToken() {
    try {
      var user = JSON.parse(window.localStorage.getItem('sveltia-cms.user') || 'null')
      if (user && user.backendName === 'github' && user.token) return user.token
    } catch (err) {
      /* JSON roto: se trata como sesión inexistente */
    }
    // Alternativa para desarrollo local (el backend "local" de Sveltia no
    // tiene token de GitHub): un token pegado a mano, solo en esta pestaña.
    return window.sessionStorage.getItem(PAT_KEY) || ''
  }

  // --------------------------------------------------------------- API GitHub

  function gh(path, options) {
    options = options || {}
    return fetch(API + path, {
      method: options.method || 'GET',
      headers: {
        Authorization: 'token ' + token,
        Accept: 'application/vnd.github+json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        var err = new Error('sin-permiso')
        err.auth = true
        throw err
      }
      if (!res.ok) throw new Error('GitHub respondió ' + res.status + ' en ' + path)
      return res.json()
    })
  }

  // El contenido de los blobs llega en base64; atob da bytes crudos y el
  // TextDecoder los vuelve UTF-8 (con atob directo, los acentos se rompen).
  function decodeBlob(base64) {
    var binary = window.atob(base64.replace(/\s/g, ''))
    var bytes = new Uint8Array(binary.length)
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }

  function fetchHead() {
    return gh('/repos/' + repo + '/branches/' + encodeURIComponent(branch)).then(function (data) {
      return { commitSha: data.commit.sha, treeSha: data.commit.commit.tree.sha }
    })
  }

  function fetchTreeEntries(treeSha, dir) {
    return gh('/repos/' + repo + '/git/trees/' + treeSha + '?recursive=1').then(function (data) {
      return data.tree.filter(function (entry) {
        return entry.type === 'blob' && entry.path.indexOf(dir) === 0 && /\.json$/.test(entry.path)
      })
    })
  }

  function fetchJsonBlob(entry) {
    return gh('/repos/' + repo + '/git/blobs/' + entry.sha).then(function (blob) {
      return JSON.parse(decodeBlob(blob.content))
    })
  }

  function fetchDirJsons(treeSha, dir) {
    return fetchTreeEntries(treeSha, dir).then(function (entries) {
      return Promise.all(
        entries.map(function (entry) {
          return fetchJsonBlob(entry).then(
            function (data) {
              return { path: entry.path, data: data }
            },
            function () {
              return null // JSON roto: mejor ignorarlo que tumbar la página
            }
          )
        })
      )
    })
  }

  // -------------------------------------------------------------------- carga

  function loadConfig() {
    return fetch('/admin/config.yml', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.text()
      })
      .then(function (yml) {
        var repoMatch = yml.match(/^\s*repo:\s*(\S+)/m)
        var branchMatch = yml.match(/^\s*branch:\s*(\S+)/m)
        if (!repoMatch) throw new Error('config.yml no tiene "repo"')
        repo = repoMatch[1]
        if (branchMatch) branch = branchMatch[1]
      })
  }

  function loadCatalog() {
    return fetchHead().then(function (head) {
      return Promise.all([
        fetchDirJsons(head.treeSha, PRODUCTS_DIR),
        fetchDirJsons(head.treeSha, CATEGORIES_DIR),
      ]).then(function (results) {
        var categories = results[1].filter(Boolean).map(function (f) {
          return f.data
        })

        // Nombre de la categoría: por su id o, como hace el sitio, deducida
        // del prefijo de la referencia (PC-001 → clásicas).
        var byId = {}
        var byPrefix = {}
        categories.forEach(function (c) {
          if (c.id) byId[c.id] = c.name || c.id
          if (c.prefix) byPrefix[String(c.prefix).toUpperCase()] = c.name || c.id
        })
        var categoryName = function (data) {
          if (data.category && byId[data.category]) return byId[data.category]
          var prefix = String(data.id || '').split('-')[0].toUpperCase()
          return byPrefix[prefix] || ''
        }

        products = results[0]
          .filter(function (f) {
            // Sin id no hay producto (archivos huérfanos de antes del widget
            // de referencia); se ignoran igual que hace el sitio.
            return f && f.data && f.data.id
          })
          .map(function (f) {
            return {
              path: f.path,
              id: String(f.data.id),
              name: f.data.name || '(sin nombre)',
              image: (f.data.images && f.data.images[0]) || f.data.image || '',
              category: categoryName(f.data),
              featured: f.data.featured === true,
              checked: f.data.featured === true,
            }
          })
          .sort(function (a, b) {
            return a.id.localeCompare(b.id) // mismo orden que useCatalog.js
          })
      })
    })
  }

  // ------------------------------------------------------------------- pintar

  function changedProducts() {
    return products.filter(function (p) {
      return p.checked !== p.featured
    })
  }

  // Los mismos que va a mostrar Home.vue: destacados en orden de referencia,
  // cortados al límite.
  function visibleOnHome() {
    return products
      .filter(function (p) {
        return p.checked
      })
      .slice(0, FEATURED_LIMIT)
  }

  function renderSummary() {
    var marked = products.filter(function (p) {
      return p.checked
    })
    var summary = $('summary')
    var text = ''

    if (!marked.length) {
      text =
        'Sin destacados: el inicio muestra los primeros ' +
        FEATURED_LIMIT +
        ' productos del catálogo.'
    } else {
      var names = visibleOnHome()
        .map(function (p) {
          return p.id
        })
        .join(', ')
      if (marked.length > FEATURED_LIMIT) {
        text =
          '⚠️ Hay ' +
          marked.length +
          ' marcados pero solo los primeros ' +
          FEATURED_LIMIT +
          ' se ven en el inicio: ' +
          names
      } else {
        text = marked.length + ' de ' + FEATURED_LIMIT + ' — en el inicio se verán: ' + names
      }
    }
    summary.textContent = text
    summary.classList.toggle('warn', marked.length > FEATURED_LIMIT)
  }

  function renderSaveBar(state) {
    var changes = changedProducts().length
    var button = $('save-button')
    var status = $('save-status')

    if (state === 'saving') {
      button.disabled = true
      button.textContent = 'Guardando…'
      status.textContent = 'No cierres la página.'
      return
    }
    if (state === 'saved') {
      button.disabled = true
      button.textContent = 'Guardar'
      status.textContent = '✅ Guardado. Se verá en el sitio en ~1 minuto.'
      return
    }
    button.disabled = changes === 0
    button.textContent = changes ? 'Guardar (' + changes + ')' : 'Guardar'
    status.textContent = changes
      ? changes + ' cambio' + (changes === 1 ? '' : 's') + ' sin guardar'
      : 'Sin cambios pendientes'
  }

  function renderList() {
    var list = $('product-list')
    list.textContent = ''

    products.forEach(function (product) {
      var row = document.createElement('label')
      row.className = 'product' + (product.checked ? ' on' : '')

      var img = document.createElement('img')
      img.className = 'thumb'
      img.alt = ''
      img.loading = 'lazy'
      if (product.image) img.src = product.image
      img.onerror = function () {
        img.removeAttribute('src') // foto aún no desplegada: queda el fondo
      }
      row.appendChild(img)

      var info = document.createElement('div')
      info.className = 'info'
      var name = document.createElement('div')
      name.className = 'name'
      name.textContent = product.name
      var meta = document.createElement('div')
      meta.className = 'meta'
      meta.textContent = product.id + (product.category ? ' · ' + product.category : '')
      info.appendChild(name)
      info.appendChild(meta)
      row.appendChild(info)

      var check = document.createElement('input')
      check.type = 'checkbox'
      check.className = 'check'
      check.checked = product.checked
      check.setAttribute('aria-label', 'Destacar ' + product.name + ' (' + product.id + ')')
      check.addEventListener('change', function () {
        product.checked = check.checked
        row.classList.toggle('on', product.checked)
        renderSummary()
        renderSaveBar()
      })
      row.appendChild(check)

      list.appendChild(row)
    })
  }

  function render() {
    renderSummary()
    renderList()
    renderSaveBar()
  }

  // ------------------------------------------------------------------ guardar

  function commitMessage(changes) {
    var on = changes
      .filter(function (p) {
        return p.checked
      })
      .map(function (p) {
        return p.id
      })
    var off = changes
      .filter(function (p) {
        return !p.checked
      })
      .map(function (p) {
        return p.id
      })
    var parts = []
    if (on.length) parts.push('destacar ' + on.join(', '))
    if (off.length) parts.push('quitar ' + off.join(', '))
    return 'Actualizar destacados: ' + parts.join('; ')
  }

  function save() {
    var changes = changedProducts()
    if (!changes.length) return
    renderSaveBar('saving')

    var head
    fetchHead()
      .then(function (h) {
        head = h
        return fetchTreeEntries(head.treeSha, PRODUCTS_DIR)
      })
      .then(function (entries) {
        var byPath = {}
        entries.forEach(function (entry) {
          byPath[entry.path] = entry
        })
        return Promise.all(
          changes.map(function (product) {
            var entry = byPath[product.path]
            if (!entry) return null // lo borraron desde el panel mientras tanto
            return fetchJsonBlob(entry).then(function (data) {
              data.featured = product.checked
              return {
                path: product.path,
                mode: '100644',
                type: 'blob',
                // Mismo formato con el que ya viven esos archivos: 2 espacios
                // de sangría y salto de línea final, para que el diff del
                // commit sea solo la línea de "featured".
                content: JSON.stringify(data, null, 2) + '\n',
              }
            })
          })
        )
      })
      .then(function (updates) {
        updates = updates.filter(Boolean)
        if (!updates.length) throw new Error('Esos productos ya no existen en el repositorio.')
        return gh('/repos/' + repo + '/git/trees', {
          method: 'POST',
          body: { base_tree: head.treeSha, tree: updates },
        })
      })
      .then(function (newTree) {
        return gh('/repos/' + repo + '/git/commits', {
          method: 'POST',
          body: {
            message: commitMessage(changes),
            tree: newTree.sha,
            parents: [head.commitSha],
          },
        })
      })
      .then(function (commit) {
        return gh('/repos/' + repo + '/git/refs/heads/' + encodeURIComponent(branch), {
          method: 'PATCH',
          body: { sha: commit.sha },
        })
      })
      .then(function () {
        changes.forEach(function (product) {
          product.featured = product.checked
        })
        renderSummary()
        renderList()
        renderSaveBar('saved')
      })
      .catch(function (err) {
        if (err.auth) {
          showScreen('screen-login')
          return
        }
        console.error('[destacados] Error al guardar:', err)
        renderSaveBar()
        window.alert(
          'No se pudo guardar: ' + err.message + '\n\nRevisa tu conexión y vuelve a intentar.'
        )
      })
  }

  // ------------------------------------------------------------------- inicio

  function start() {
    token = findToken()
    if (!token) {
      showScreen('screen-login')
      return
    }
    showScreen('screen-loading')
    loadConfig()
      .then(loadCatalog)
      .then(function () {
        showScreen('list')
        render()
      })
      .catch(function (err) {
        if (err.auth) {
          // Token vencido o sin acceso al repo: se vuelve a pedir sesión.
          window.sessionStorage.removeItem(PAT_KEY)
          showScreen('screen-login')
          return
        }
        console.error('[destacados] Error al cargar:', err)
        showError('No se pudieron cargar los productos: ' + err.message)
      })
  }

  $('save-button').addEventListener('click', save)
  $('pat-button').addEventListener('click', function () {
    var pat = $('pat-input').value.trim()
    if (!pat) return
    window.sessionStorage.setItem(PAT_KEY, pat)
    start()
  })

  // Aviso al salir con cambios sin guardar: en el teléfono es fácil deslizar
  // hacia atrás sin querer.
  window.addEventListener('beforeunload', function (event) {
    if (changedProducts().length) event.preventDefault()
  })

  start()
})()
