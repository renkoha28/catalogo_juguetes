/**
 * Subir fotos (/admin/fotos.html).
 *
 * Reemplaza la subida de fotos de Sveltia para el caso común (fotos de
 * producto desde el teléfono), que fallaba seguido en el celular de la dueña:
 *
 *  - ELEGIR: dos botones. "Archivos" abre el explorador completo de Android
 *    (todas las carpetas, búsqueda por nombre y el NOMBRE REAL del archivo);
 *    "Galería" abre el selector de fotos del sistema, que solo muestra algunos
 *    álbumes y entrega las fotos con un número (1000183013) en vez del nombre.
 *  - ASIGNAR: si el nombre empieza con la referencia (PC-015-1.jpg,
 *    pc015 frente.jpg…) la foto va sola a ese producto. Lo demás va al
 *    producto elegido arriba o queda en "Sin producto" para asignarlo.
 *  - CONVERTIR (en el teléfono, a propósito): una foto a la vez y reducida
 *    MIENTRAS se decodifica (createImageBitmap con resize), así el teléfono
 *    nunca tiene varias fotos de 12–50 MP abiertas en memoria. Sale WebP 90,
 *    máx. 1600 px — la misma política de scripts/optimize-images.mjs. Si el
 *    navegador no sabe codificar WebP (Safari), sale JPEG 90; el sitio lo
 *    sirve igual y sus derivadas responsivas son WebP de todos modos.
 *    Convertir aquí y no en el servidor es lo que hace que la subida pese
 *    ~300 KB por foto en vez de ~4 MB.
 *  - SUBIR: cada foto es una petición propia a GitHub (git blob) con
 *    reintentos automáticos y espera de reconexión; si aun así falla, el botón
 *    "Reintentar" sigue desde la que quedó: las ya subidas no se repiten.
 *  - GUARDAR: un solo commit (tree → commit → ref) con las fotos nuevas, los
 *    JSON de producto actualizados y el borrado de las fotos que se quitaron
 *    (si ningún otro producto las usa). Un commit = un solo deploy.
 *
 * Nombres en el repo: <referencia>-<n>.webp en minúsculas (pc-015-1.webp),
 * con n = siguiente número libre de esa referencia, así nunca se pisa un
 * archivo existente. El ORDEN de las fotos lo da la lista `images` del JSON,
 * no el número del nombre: reordenar no renombra archivos.
 *
 * Sesión: la misma que Sveltia deja en localStorage ('sveltia-cms.user'), igual
 * que destacados.js. Repo y rama se leen de /admin/config.yml.
 */
;(function () {
  'use strict'

  const API = 'https://api.github.com'
  const PRODUCTS_DIR = 'content/products/'
  const IMAGES_DIR = 'public/images/products/'
  const PUBLIC_PREFIX = '/images/products/'
  const MAX_PHOTOS = 4 // mismo `max` que el campo images de config.yml
  const MAX_SIDE = 1600 // misma política que scripts/optimize-images.mjs
  const QUALITY = 0.9
  // Mismo token manual que destacados.js (solo para pruebas en local).
  const PAT_KEY = 'catalogo.destacados-token'
  const REQUEST_TIMEOUT_MS = 90000
  const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000] // 5 intentos en total

  let repo = ''
  let branch = 'main'
  let token = ''

  /** @type {{ path: string, id: string, name: string, images: string[] }[]} */
  let products = []

  /**
   * Un grupo por producto con la lista FINAL de fotos, en orden. Cada foto es
   * { kind: 'existing', path } o una foto nueva (ver addFiles). El grupo con
   * id null es "Sin producto".
   * @type {Map<string | null, { id: string | null, list: any[] }>}
   */
  const groups = new Map()

  let busy = false // subiendo/guardando
  let wakeLock = null

  const $ = (id) => document.getElementById(id)

  // ---------------------------------------------------------------- pantallas

  const SCREENS = ['screen-loading', 'screen-login', 'screen-error']

  function showScreen(id) {
    SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id))
    const ready = id === 'workspace'
    $('workspace').classList.toggle('hidden', !ready)
    $('savebar').classList.toggle('hidden', !ready)
  }

  function showError(message) {
    $('error-message').textContent = message
    showScreen('screen-error')
  }

  function setBanner(kind, html) {
    const banner = $('banner')
    if (!kind) {
      banner.className = 'banner hidden'
      banner.textContent = ''
      return
    }
    banner.className = 'banner ' + kind
    banner.innerHTML = html
  }

  // ------------------------------------------------------------------- sesión

  function findToken() {
    try {
      const user = JSON.parse(window.localStorage.getItem('sveltia-cms.user') || 'null')
      if (user && user.backendName === 'github' && user.token) return user.token
    } catch (err) {
      /* JSON roto: se trata como sesión inexistente */
    }
    return window.sessionStorage.getItem(PAT_KEY) || ''
  }

  // ------------------------------------------------- red: timeout + reintentos

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  // Sin señal no tiene sentido gastar intentos: se espera a que vuelva (o a
  // que pase un rato, por si navigator.onLine miente).
  function waitForOnline(maxMs) {
    if (navigator.onLine !== false) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        window.removeEventListener('online', done)
        window.clearTimeout(timer)
        resolve()
      }
      const timer = window.setTimeout(done, maxMs)
      window.addEventListener('online', done)
    })
  }

  async function gh(path, options = {}) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let res
    try {
      res = await fetch(API + path, {
        method: options.method || 'GET',
        headers: {
          Authorization: 'token ' + token,
          Accept: 'application/vnd.github+json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        cache: 'no-store',
      })
    } catch (cause) {
      // Sin conexión, conexión cortada o timeout: vale la pena reintentar.
      const err = new Error('sin conexión')
      err.retryable = true
      throw err
    } finally {
      window.clearTimeout(timer)
    }
    if (res.status === 401 || res.status === 403) {
      const err = new Error('sin-permiso')
      err.auth = true
      throw err
    }
    if (!res.ok) {
      const err = new Error('GitHub respondió ' + res.status)
      err.status = res.status
      err.retryable = res.status >= 500 || res.status === 429
      throw err
    }
    return res.json()
  }

  /**
   * Ejecuta fn con reintentos para errores de red/servidor. onRetry(n, total)
   * permite mostrar "reintentando" en pantalla.
   */
  async function withRetry(fn, onRetry) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn()
      } catch (err) {
        if (!err.retryable || attempt >= RETRY_DELAYS_MS.length) throw err
        if (onRetry) onRetry(attempt + 2, RETRY_DELAYS_MS.length + 1)
        await sleep(RETRY_DELAYS_MS[attempt])
        await waitForOnline(60000)
      }
    }
  }

  const ghRetry = (path, options) => withRetry(() => gh(path, options))

  function decodeBlob(base64) {
    const binary = window.atob(base64.replace(/\s/g, ''))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  async function fetchHead() {
    const data = await ghRetry('/repos/' + repo + '/branches/' + encodeURIComponent(branch))
    return { commitSha: data.commit.sha, treeSha: data.commit.commit.tree.sha }
  }

  async function fetchTree(treeSha) {
    const data = await ghRetry('/repos/' + repo + '/git/trees/' + treeSha + '?recursive=1')
    return data.tree.filter((entry) => entry.type === 'blob')
  }

  async function fetchJson(sha) {
    const blob = await ghRetry('/repos/' + repo + '/git/blobs/' + sha)
    return JSON.parse(decodeBlob(blob.content))
  }

  // -------------------------------------------------------------------- carga

  async function loadConfig() {
    const res = await fetch('/admin/config.yml', { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const yml = await res.text()
    const repoMatch = yml.match(/^\s*repo:\s*(\S+)/m)
    const branchMatch = yml.match(/^\s*branch:\s*(\S+)/m)
    if (!repoMatch) throw new Error('config.yml no tiene "repo"')
    repo = repoMatch[1]
    if (branchMatch) branch = branchMatch[1]
  }

  async function loadCatalog() {
    const head = await fetchHead()
    const entries = (await fetchTree(head.treeSha)).filter(
      (e) => e.path.startsWith(PRODUCTS_DIR) && e.path.endsWith('.json')
    )
    const files = await Promise.all(
      entries.map((entry) =>
        fetchJson(entry.sha).then(
          (data) => ({ path: entry.path, data }),
          () => null // JSON roto: se ignora, igual que en el sitio
        )
      )
    )
    products = files
      .filter((f) => f && f.data && f.data.id)
      .map((f) => ({
        path: f.path,
        id: String(f.data.id),
        name: f.data.name || '(sin nombre)',
        images: Array.isArray(f.data.images) ? f.data.images.slice() : [],
      }))
      .sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }))
  }

  const findProduct = (id) => products.find((p) => p.id === id)

  // ------------------------------------------------- asignar por nombre de foto

  // "PC-001" → /(?:^|[^A-Z0-9])PC[\s_.-]*0*1(?![0-9])/i: acepta PC-001,
  // pc001, PC_1, "Peluca PC-001 frente"…, pero no PC-0011 ni PPC-001.
  function idPattern(id) {
    const chunks = id.toUpperCase().match(/[A-Z]+|\d+/g) || []
    const body = chunks
      .map((chunk) => (/^\d+$/.test(chunk) ? '0*' + String(Number(chunk)) : chunk))
      .join('[\\s_.-]*')
    return new RegExp('(?:^|[^A-Z0-9])' + body + '(?![0-9])', 'i')
  }

  function matchProduct(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '')
    let best = null
    products.forEach((p) => {
      if (idPattern(p.id).test(base) && (!best || p.id.length > best.id.length)) best = p
    })
    return best
  }

  // ------------------------------------------------------------------- grupos

  function ensureGroup(id) {
    if (!groups.has(id)) {
      const product = id && findProduct(id)
      groups.set(id, {
        id,
        list: product
          ? product.images.map((path) => ({ kind: 'existing', path }))
          : [],
      })
    }
    return groups.get(id)
  }

  const newItems = () =>
    Array.from(groups.values()).flatMap((g) => g.list.filter((item) => item.kind === 'new'))

  const alreadyAdded = (file) =>
    newItems().some(
      (item) =>
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
    )

  const naturalCompare = (a, b) =>
    a.file.name.localeCompare(b.file.name, 'es', { numeric: true, sensitivity: 'base' })

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => !alreadyAdded(file))
    if (!files.length) return
    setBanner(null)

    const fallback = $('default-target').value || null
    const incoming = new Map()
    files.forEach((file) => {
      const product = matchProduct(file.name)
      const id = product ? product.id : fallback
      if (!incoming.has(id)) incoming.set(id, [])
      incoming.get(id).push({
        kind: 'new',
        file,
        status: 'waiting', // waiting → converting → ready → uploading → uploaded | error
        blob: null,
        ext: '',
        url: '',
        sha: '',
        note: '',
      })
    })

    // Dentro de cada producto, en orden natural del nombre: PC-015-1, -2, …
    incoming.forEach((items, id) => {
      items.sort(naturalCompare)
      ensureGroup(id).list.push(...items)
    })

    render()
    convertQueue()
  }

  function moveGroupItems(fromId, toId) {
    const from = groups.get(fromId)
    if (!from || fromId === toId) return
    ensureGroup(toId).list.push(...from.list.filter((item) => item.kind === 'new'))
    groups.delete(fromId)
    render()
  }

  function removeItem(group, index) {
    const [item] = group.list.splice(index, 1)
    if (item && item.url) URL.revokeObjectURL(item.url)
    if (!group.list.some((i) => i.kind === 'new')) groups.delete(group.id)
    render()
  }

  function removeExisting(group) {
    group.list = group.list.filter((item) => item.kind === 'new')
    render()
  }

  function moveItem(group, index, delta) {
    const target = index + delta
    if (target < 0 || target >= group.list.length) return
    const [item] = group.list.splice(index, 1)
    group.list.splice(target, 0, item)
    render()
  }

  // ------------------------------------------------------- convertir en el tel.

  // Dimensiones desde la cabecera: el evento load de <img> llega sin haber
  // decodificado los píxeles (eso pasa al pintarla), y naturalWidth/Height ya
  // vienen con la rotación EXIF aplicada.
  function readDimensions(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('decode'))
      }
      img.src = url
    })
  }

  function fitInside(width, height) {
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
    return { width: Math.round(width * scale), height: Math.round(height * scale) }
  }

  async function decodeResized(file, target) {
    const options = {
      resizeWidth: target.width,
      resizeHeight: target.height,
      resizeQuality: 'high',
      imageOrientation: 'from-image',
    }
    let bitmap = await createImageBitmap(file, options)
    // Si el navegador aplicó el tamaño antes de rotar, sale "acostado":
    // se repite con las medidas invertidas.
    const wantLandscape = target.width >= target.height
    const gotLandscape = bitmap.width >= bitmap.height
    if (target.width !== target.height && wantLandscape !== gotLandscape) {
      bitmap.close()
      bitmap = await createImageBitmap(file, {
        ...options,
        resizeWidth: target.height,
        resizeHeight: target.width,
      })
    }
    return bitmap
  }

  function makeCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  function encodeCanvas(canvas, type) {
    if (canvas.convertToBlob) return canvas.convertToBlob({ type, quality: QUALITY })
    return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
  }

  async function convertFile(file) {
    let dims
    try {
      dims = await readDimensions(file)
    } catch (err) {
      const heic = /\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)
      throw new Error(
        heic
          ? 'Formato HEIC: no se puede abrir aquí. Cambia la cámara a JPG o usa otra foto.'
          : 'No es una foto o el archivo está dañado.'
      )
    }
    const target = fitInside(dims.width, dims.height)

    let source
    try {
      source = await decodeResized(file, target)
    } catch (err) {
      // Navegador sin resize en createImageBitmap: se decodifica completa
      // (solo esta foto; la cola va de a una).
      source = await createImageBitmap(file)
    }

    const canvas = makeCanvas(target.width, target.height)
    const context = canvas.getContext('2d')
    context.drawImage(source, 0, 0, target.width, target.height)
    if (source.close) source.close()

    let blob = await encodeCanvas(canvas, 'image/webp')
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') {
      blob = await encodeCanvas(canvas, 'image/jpeg')
      ext = 'jpg'
    }
    if (!blob) throw new Error('No se pudo convertir la foto.')
    // Libera la memoria del lienzo ya mismo en vez de esperar al recolector.
    canvas.width = 0
    canvas.height = 0
    return { blob, ext }
  }

  let converting = false

  // Mientras quede alguna foto en espera o preparándose no se puede subir
  // (el bucle de conversión puede estar entre una foto y la siguiente).
  const preparing = () =>
    converting || newItems().some((i) => i.status === 'waiting' || i.status === 'converting')

  // De a UNA foto: es lo que evita que el teléfono se quede sin memoria.
  async function convertQueue() {
    if (converting) return
    converting = true
    try {
      for (;;) {
        const item = newItems().find((i) => i.status === 'waiting')
        if (!item) break
        item.status = 'converting'
        renderItemState(item)
        try {
          const { blob, ext } = await convertFile(item.file)
          item.blob = blob
          item.ext = ext
          item.url = URL.createObjectURL(blob)
          item.status = 'ready'
          item.note = formatSize(item.file.size) + ' → ' + formatSize(blob.size)
        } catch (err) {
          item.status = 'error'
          item.note = err.message || 'No se pudo convertir.'
        }
        render()
      }
    } finally {
      converting = false
      // El último render del bucle corrió con converting = true (botón
      // deshabilitado, "Preparando fotos…"): hay que repintar ya sin él.
      render()
    }
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    return Math.max(1, Math.round(bytes / 1024)) + ' KB'
  }

  // ------------------------------------------------------------ subir + guardar

  function slug(id) {
    return id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  /** Grupos con producto que tienen al menos una foto nueva. */
  const pendingGroups = () =>
    Array.from(groups.values()).filter((g) => g.id && g.list.some((i) => i.kind === 'new'))

  function problems() {
    const list = []
    const unmatched = groups.get(null)
    if (unmatched && unmatched.list.length) {
      list.push(unmatched.list.length + ' foto(s) sin producto: asígnalas o quítalas.')
    }
    pendingGroups().forEach((g) => {
      if (g.list.length > MAX_PHOTOS) {
        list.push(g.id + ' quedaría con ' + g.list.length + ' fotos (máximo ' + MAX_PHOTOS + ').')
      }
      if (g.list.some((i) => i.status === 'error')) {
        list.push(g.id + ' tiene fotos con error: quítalas.')
      }
    })
    return list
  }

  async function uploadPhotos() {
    const items = pendingGroups().flatMap((g) => g.list.filter((i) => i.kind === 'new' && !i.sha))
    let done = 0
    const total = items.length
    for (const item of items) {
      item.status = 'uploading'
      item.note = 'Subiendo…'
      renderItemState(item)
      setStatus('Subiendo foto ' + (done + 1) + ' de ' + total + '… No cierres la página.')
      const content = await blobToBase64(item.blob)
      const result = await withRetry(
        () =>
          gh('/repos/' + repo + '/git/blobs', {
            method: 'POST',
            body: { content, encoding: 'base64' },
          }),
        (n, max) => {
          item.note = 'Reintentando (' + n + '/' + max + ')…'
          renderItemState(item)
        }
      )
      item.sha = result.sha
      item.status = 'uploaded'
      item.note = 'Subida ✓'
      renderItemState(item)
      done++
    }
  }

  function commitMessage(list) {
    return (
      'Fotos: ' +
      list
        .map((g) => {
          const added = g.list.filter((i) => i.kind === 'new').length
          return g.id + ' (+' + added + ')'
        })
        .join(', ')
    )
  }

  async function commitAll() {
    const list = pendingGroups()
    // Si alguien guardó desde el panel justo ahora, la rama avanzó y el ref
    // update da 422: se rehace el commit sobre la versión nueva.
    for (let attempt = 1; ; attempt++) {
      setStatus('Guardando cambios en el catálogo…')
      const head = await fetchHead()
      const tree = await fetchTree(head.treeSha)
      const byPath = new Map(tree.map((e) => [e.path, e]))
      const takenNames = new Set(
        tree.filter((e) => e.path.startsWith(IMAGES_DIR)).map((e) => e.path.slice(IMAGES_DIR.length))
      )

      const updates = []
      const finalImages = new Map()

      for (const group of list) {
        const product = findProduct(group.id)
        const entry = product && byPath.get(product.path)
        if (!entry) throw new Error('El producto ' + group.id + ' ya no existe.')
        const data = await fetchJson(entry.sha)

        const base = slug(group.id)
        // Solo números cortos: los nombres de Sveltia (pc-015-3f9a1c2b) llevan
        // 8 caracteres aleatorios que a veces son todos dígitos.
        const used = Array.from(takenNames)
          .map((name) => name.match(new RegExp('^' + base + '-(\\d{1,3})\\.[a-z]+$')))
          .filter(Boolean)
          .map((m) => Number(m[1]))
        let next = used.length ? Math.max(...used) + 1 : 1

        const images = group.list.map((item) => {
          if (item.kind === 'existing') return item.path
          const name = base + '-' + next++ + '.' + item.ext
          takenNames.add(name)
          updates.push({ path: IMAGES_DIR + name, mode: '100644', type: 'blob', sha: item.sha })
          return PUBLIC_PREFIX + name
        })

        data.images = images
        finalImages.set(group.id, images)
        updates.push({
          path: product.path,
          mode: '100644',
          type: 'blob',
          content: JSON.stringify(data, null, 2) + '\n',
        })
      }

      // Fotos quitadas: se borran del repo solo si ningún producto las usa ya.
      const stillUsed = new Set()
      products.forEach((p) => {
        ;(finalImages.get(p.id) || p.images).forEach((path) => stillUsed.add(path))
      })
      list.forEach((group) => {
        findProduct(group.id).images.forEach((path) => {
          const repoPath = 'public' + path
          if (!stillUsed.has(path) && path.startsWith(PUBLIC_PREFIX) && byPath.has(repoPath)) {
            updates.push({ path: repoPath, mode: '100644', type: 'blob', sha: null })
          }
        })
      })

      const newTree = await ghRetry('/repos/' + repo + '/git/trees', {
        method: 'POST',
        body: { base_tree: head.treeSha, tree: updates },
      })
      const commit = await ghRetry('/repos/' + repo + '/git/commits', {
        method: 'POST',
        body: { message: commitMessage(list), tree: newTree.sha, parents: [head.commitSha] },
      })
      try {
        await ghRetry('/repos/' + repo + '/git/refs/heads/' + encodeURIComponent(branch), {
          method: 'PATCH',
          body: { sha: commit.sha },
        })
      } catch (err) {
        if (err.status === 422 && attempt < 3) continue
        throw err
      }

      finalImages.forEach((images, id) => {
        findProduct(id).images = images
      })
      return list.map((g) => g.id)
    }
  }

  async function lockScreen(on) {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
      if (!on && wakeLock) {
        await wakeLock.release()
        wakeLock = null
      }
    } catch (err) {
      /* sin wake lock: no pasa nada, solo puede apagarse la pantalla */
    }
  }

  async function save() {
    if (busy || problems().length || preparing()) return
    busy = true
    setBanner(null)
    render()
    lockScreen(true)
    try {
      await uploadPhotos()
      const ids = await commitAll()
      newItems().forEach((item) => item.url && URL.revokeObjectURL(item.url))
      groups.clear()
      setBanner(
        'ok',
        '✅ Listo: fotos guardadas en <b>' +
          ids.join(', ') +
          '</b>. Se verán en el sitio en ~1 minuto.'
      )
    } catch (err) {
      if (err.auth) {
        showScreen('screen-login')
        return
      }
      console.error('[fotos] Error al subir:', err)
      newItems().forEach((item) => {
        if (item.status === 'uploading') {
          item.status = 'ready'
          item.note = 'Pendiente'
        }
      })
      setBanner(
        'error',
        '⚠️ Se cortó la conexión (' +
          (err.message || 'error') +
          '). Las fotos que ya subieron no se pierden: toca <b>Reintentar</b> y sigue desde donde quedó.'
      )
    } finally {
      busy = false
      lockScreen(false)
      render()
    }
  }

  // ------------------------------------------------------------------- pintar

  function setStatus(text) {
    $('save-status').textContent = text
  }

  function productOptions(select, selected, emptyLabel) {
    select.textContent = ''
    const empty = document.createElement('option')
    empty.value = ''
    empty.textContent = emptyLabel
    select.appendChild(empty)
    products.forEach((p) => {
      const option = document.createElement('option')
      option.value = p.id
      option.textContent = p.id + ' · ' + p.name
      if (p.id === selected) option.selected = true
      select.appendChild(option)
    })
  }

  function thumbURL(path) {
    // La derivada de 400 px (la genera el build) pesa mucho menos que la original.
    return path.replace('/images/', '/images/derived/').replace(/\.(webp|jpe?g|png)$/i, '-400.webp')
  }

  const STATE_TEXT = {
    waiting: 'En espera…',
    converting: 'Preparando…',
  }

  function stateClass(item) {
    if (item.status === 'error') return 'state error'
    if (item.status === 'uploaded') return 'state ok'
    return 'state'
  }

  function renderItemState(item) {
    if (!item.stateEl) return
    item.stateEl.className = stateClass(item)
    item.stateEl.textContent = STATE_TEXT[item.status] || item.note
  }

  function iconButton(icon, label, disabled, onClick) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'msym'
    button.textContent = icon
    button.title = label
    button.setAttribute('aria-label', label)
    button.disabled = disabled
    button.addEventListener('click', onClick)
    return button
  }

  function renderPhoto(group, item, index) {
    const cell = document.createElement('div')
    cell.className = 'photo' + (item.kind === 'new' ? ' is-new' : '')

    const frame = document.createElement('div')
    frame.className = 'frame'
    const img = document.createElement('img')
    img.alt = ''
    img.loading = 'lazy'
    if (item.kind === 'existing') {
      img.src = thumbURL(item.path)
      img.onerror = () => {
        img.onerror = null
        img.src = item.path
      }
      frame.appendChild(img)
    } else if (item.url) {
      img.src = item.url
      frame.appendChild(img)
    } else {
      const icon = document.createElement('span')
      icon.className = 'msym'
      icon.textContent = item.status === 'error' ? 'broken_image' : 'hourglass_empty'
      frame.appendChild(icon)
    }
    cell.appendChild(frame)

    if (group.id) {
      const pos = document.createElement('span')
      pos.className = 'pos'
      pos.textContent = String(index + 1)
      cell.appendChild(pos)
    }
    if (item.kind === 'new') {
      const badge = document.createElement('span')
      badge.className = 'badge'
      badge.textContent = 'Nueva'
      cell.appendChild(badge)
    }

    const state = document.createElement('div')
    if (item.kind === 'new') {
      item.stateEl = state
      renderItemState(item)
      state.title = item.file.name
    } else {
      state.className = 'state'
      state.textContent = 'Actual'
    }
    cell.appendChild(state)

    const tools = document.createElement('div')
    tools.className = 'tools'
    const locked = busy
    if (group.id) {
      tools.appendChild(
        iconButton('chevron_left', 'Mover antes', locked || index === 0, () =>
          moveItem(group, index, -1)
        )
      )
    }
    tools.appendChild(iconButton('close', 'Quitar', locked, () => removeItem(group, index)))
    if (group.id) {
      tools.appendChild(
        iconButton('chevron_right', 'Mover después', locked || index === group.list.length - 1, () =>
          moveItem(group, index, 1)
        )
      )
    }
    cell.appendChild(tools)
    return cell
  }

  function renderGroup(group) {
    const product = group.id && findProduct(group.id)
    const box = document.createElement('section')
    box.className = 'group' + (group.id ? '' : ' unmatched')

    const head = document.createElement('div')
    head.className = 'group-head'
    const info = document.createElement('div')
    info.className = 'info'
    const name = document.createElement('div')
    name.className = 'name'
    const meta = document.createElement('div')
    meta.className = 'meta'

    if (product) {
      name.textContent = product.id + ' · ' + product.name
      const added = group.list.filter((i) => i.kind === 'new').length
      const kept = group.list.length - added
      const over = group.list.length > MAX_PHOTOS
      meta.textContent =
        'Quedará con ' +
        group.list.length +
        ' foto' +
        (group.list.length === 1 ? '' : 's') +
        ' (' +
        added +
        ' nueva' +
        (added === 1 ? '' : 's') +
        (kept ? ', ' + kept + ' actual' + (kept === 1 ? '' : 'es') : '') +
        ')' +
        (over ? ' — máximo ' + MAX_PHOTOS + ': quita ' + (group.list.length - MAX_PHOTOS) : '')
      meta.classList.toggle('warn', over)
    } else {
      name.textContent = 'Sin producto'
      meta.textContent = 'El nombre de estas fotos no trae una referencia conocida.'
    }
    info.appendChild(name)
    info.appendChild(meta)
    head.appendChild(info)
    box.appendChild(head)

    const body = document.createElement('div')
    body.className = 'group-body'

    if (!group.id) {
      const select = document.createElement('select')
      productOptions(select, '', 'Elegir a qué producto van…')
      select.disabled = busy
      select.addEventListener('change', () => {
        if (select.value) moveGroupItems(null, select.value)
      })
      body.appendChild(select)
    } else if (group.list.some((i) => i.kind === 'existing') && !busy) {
      const clear = document.createElement('button')
      clear.type = 'button'
      clear.className = 'link-button'
      clear.textContent = 'Quitar las fotos actuales (reemplazarlas por las nuevas)'
      clear.addEventListener('click', () => removeExisting(group))
      body.appendChild(clear)
    }

    const grid = document.createElement('div')
    grid.className = 'photos'
    group.list.forEach((item, index) => grid.appendChild(renderPhoto(group, item, index)))
    body.appendChild(grid)
    box.appendChild(body)
    return box
  }

  function renderSaveBar() {
    const button = $('save-button')
    const issues = problems()
    const items = newItems()
    const pendingUpload = items.filter((i) => !i.sha).length

    if (busy) {
      button.disabled = true
      button.textContent = 'Subiendo…'
      return
    }
    if (!items.length) {
      button.disabled = true
      button.textContent = 'Subir y guardar'
      setStatus('Sin fotos pendientes')
      return
    }
    const retry = items.some((i) => i.sha) // ya hubo un intento a medias
    button.textContent = retry ? 'Reintentar' : 'Subir y guardar (' + items.length + ')'
    if (preparing()) {
      button.disabled = true
      setStatus('Preparando fotos…')
    } else if (issues.length) {
      button.disabled = true
      setStatus(issues[0])
    } else {
      button.disabled = false
      setStatus(
        retry
          ? 'Faltan ' + pendingUpload + ' foto(s) por subir.'
          : items.length + ' foto(s) lista(s) para subir.'
      )
    }
  }

  function render() {
    const container = $('groups')
    container.textContent = ''
    // "Sin producto" primero: es lo que hay que resolver.
    const ordered = Array.from(groups.values()).sort((a, b) => {
      if (!a.id) return -1
      if (!b.id) return 1
      return a.id.localeCompare(b.id, 'es', { numeric: true })
    })
    ordered.forEach((group) => container.appendChild(renderGroup(group)))
    $('empty').classList.toggle('hidden', ordered.length > 0)
    $('pick-files').disabled = busy
    $('pick-gallery').disabled = busy
    renderSaveBar()
  }

  // ------------------------------------------------------------------- inicio

  async function start() {
    token = findToken()
    if (!token) {
      showScreen('screen-login')
      return
    }
    showScreen('screen-loading')
    try {
      await loadConfig()
      await loadCatalog()
      const preset = new URLSearchParams(window.location.search).get('ref') || ''
      const presetProduct = products.find((p) => p.id.toLowerCase() === preset.toLowerCase())
      productOptions(
        $('default-target'),
        presetProduct ? presetProduct.id : '',
        'Ninguno — preguntar después'
      )
      showScreen('workspace')
      render()
    } catch (err) {
      if (err.auth) {
        window.sessionStorage.removeItem(PAT_KEY)
        showScreen('screen-login')
        return
      }
      console.error('[fotos] Error al cargar:', err)
      showError('No se pudieron cargar los productos: ' + err.message)
    }
  }

  ;['pick-files', 'pick-gallery'].forEach((id) => {
    $(id).addEventListener('change', (event) => {
      addFiles(event.target.files)
      event.target.value = '' // permite volver a elegir las mismas fotos
    })
  })
  $('save-button').addEventListener('click', save)
  $('pat-button').addEventListener('click', () => {
    const pat = $('pat-input').value.trim()
    if (!pat) return
    window.sessionStorage.setItem(PAT_KEY, pat)
    start()
  })

  // En el teléfono es fácil deslizar "atrás" sin querer.
  window.addEventListener('beforeunload', (event) => {
    if (newItems().length) event.preventDefault()
  })

  // Expuesto solo para las pruebas automáticas (no lo usa la página).
  window.__fotosTest = { idPattern, fitInside, slug, convertFile }

  start()
})()
