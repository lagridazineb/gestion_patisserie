const { pool } = require('../config/db')

// Ajuste (incrémente/décrémente) le stock d'un produit, jamais en dessous de 0.
// Fonctionne même si la ligne n'existe pas encore (INSERT ... ON DUPLICATE KEY).
async function adjustStock(productId, delta) {
  await pool.query(
    `INSERT INTO stock_quantities (product_id, quantity) VALUES (?, GREATEST(0, ?))
     ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + ?)`,
    [productId, delta, delta]
  )
}

// Fixe le stock d'un produit à une valeur précise (jamais négative).
async function setStock(productId, value) {
  const v = Math.max(0, Number(value) || 0)
  await pool.query(
    `INSERT INTO stock_quantities (product_id, quantity) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE quantity = ?`,
    [productId, v, v]
  )
}

// Renvoie tout le stock sous forme d'objet { productId: quantity }
async function getStockMap() {
  const [rows] = await pool.query('SELECT product_id, quantity FROM stock_quantities')
  const map = {}
  rows.forEach((r) => { map[r.product_id] = Number(r.quantity) })
  return map
}

// Génère un numéro de ticket unique et croissant, partagé entre ventes et commandes.
async function nextTicketNumber() {
  await pool.query('UPDATE ticket_counter SET value = LAST_INSERT_ID(value + 1) WHERE id = 1')
  const [rows] = await pool.query('SELECT LAST_INSERT_ID() AS ticketNumber')
  return rows[0].ticketNumber
}

// mysql2 parse automatiquement les colonnes de type JSON en objets JS — mais selon le driver/la
// version, on peut aussi recevoir du texte brut. Cette fonction gère les deux cas sans planter.
function safeJsonParse(value, fallback) {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return fallback
  }
}

// --------------------------------------------------------------------------------------
// Catalogue produits côté serveur : le catalogue de base (id/nom/catégorie/prix) est défini
// une seule fois dans client/src/data/products.js (fichier JS pur, sans dépendance React,
// donc chargeable ici via import() dynamique — ESM depuis du CommonJS). On le combine avec
// la surcouche (custom_products / product_edits / deleted_products) déjà stockée en base,
// pour reconstituer le MÊME catalogue à jour que celui vu par le client.
// --------------------------------------------------------------------------------------
const path = require('path')
const { pathToFileURL } = require('url')

let cachedProductsModule = null
async function loadProductsModule() {
  if (!cachedProductsModule) {
    const modulePath = path.join(__dirname, '..', '..', 'client', 'src', 'data', 'products.js')
    cachedProductsModule = await import(pathToFileURL(modulePath).href)
  }
  return cachedProductsModule
}

// Catégories/produits "périssables" vidés chaque soir — dupliqué ici volontairement (constante
// triviale) car client/src/data/stockStore.js n'est pas portable côté serveur (il importe axios).
const PERISHABLE_CATEGORIES = ['pain', 'viennoiserie', 'sale']
const PERISHABLE_MILLEFEUILLE_IDS = ['m1b']

// Reconstitue le catalogue complet à jour (base + surcouche admin), sous la forme
// { id, name, category, price } utilisée par performClear ci-dessous.
async function getServerCatalog() {
  const { mergeProductOverlay } = await loadProductsModule()
  const [customProducts] = await pool.query('SELECT * FROM custom_products')
  const [edits] = await pool.query('SELECT * FROM product_edits')
  const [deleted] = await pool.query('SELECT product_id FROM deleted_products')
  const merged = mergeProductOverlay({
    customProducts: customProducts.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), category: p.category, image: p.image })),
    edits: edits.map((e) => ({ productId: e.product_id, name: e.name, price: e.price === null ? null : Number(e.price), category: e.category, image: e.image })),
    deletedIds: deleted.map((d) => d.product_id),
  })
  return merged.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price }))
}

// Cœur du vidage (soir ou complet) : identique à ce que faisait jusqu'ici uniquement la route
// POST /api/stock/clear, extrait ici pour être appelé aussi bien par la route (bouton manuel,
// avec affectedProducts/fullCatalog fournis par le client) que par le cron serveur ci-dessous
// (qui les calcule lui-même via getServerCatalog, sans dépendre d'un navigateur ouvert).
async function performClear({ type, affectedProducts, fullCatalog }) {
  const stock = await getStockMap()
  const entries = affectedProducts
    .map((p) => {
      const qty = stock[p.id] ?? 0
      return { productId: p.id, name: p.name, category: p.category, qty, price: p.price || 0, value: qty * (p.price || 0) }
    })
    .filter((e) => e.qty > 0)
  const totalQuantity = entries.reduce((s, e) => s + e.qty, 0)
  const totalValue = entries.reduce((s, e) => s + e.value, 0)

  let carryover = []
  let productionSummary = []
  if (type === 'soir') {
    const clearedIds = new Set(affectedProducts.map((p) => p.id))
    carryover = (Array.isArray(fullCatalog) ? fullCatalog : [])
      .filter((p) => !clearedIds.has(p.id))
      .map((p) => {
        const qty = stock[p.id] ?? 0
        return { productId: p.id, name: p.name, category: p.category, qty, price: p.price || 0, value: qty * (p.price || 0) }
      })
      .filter((e) => e.qty > 0)

    const [prodRows] = await pool.query(
      `SELECT category, SUM(quantity) AS qty, SUM(quantity * COALESCE(price, 0)) AS value
       FROM production_entries WHERE production_date = CURDATE() GROUP BY category`
    )
    productionSummary = prodRows.map((r) => ({ category: r.category, qty: Number(r.qty), value: Number(r.value) }))
  }

  for (const p of affectedProducts) {
    await setStock(p.id, 0)
  }

  const productIds = affectedProducts.map((p) => p.id).filter(Boolean)
  if (productIds.length) {
    const placeholders = productIds.map(() => '?').join(',')
    await pool.query(
      `DELETE FROM production_entries WHERE production_date = CURDATE() AND product_id IN (${placeholders})`,
      productIds
    )
  }

  const id = Date.now()
  await pool.query(
    `INSERT INTO stock_clear_log (id, type, entries, total_quantity, total_value, product_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [id, type, JSON.stringify(entries), totalQuantity, totalValue, entries.length]
  )

  if (type === 'soir') {
    const today = new Date().toISOString().slice(0, 10)
    await pool.query('UPDATE eod_settings SET last_cleared_date = ? WHERE id = 1', [today])

    const retourTotal = carryover.reduce((s, e) => s + e.value, 0)
    const retourId = Date.now() + 1
    await pool.query(
      `INSERT INTO retours_caisse (id, retour_date, total_value, entries, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE total_value = VALUES(total_value), entries = VALUES(entries), updated_at = NOW()`,
      [retourId, today, retourTotal, JSON.stringify(carryover)]
    )
  }

  return { success: true, id, type, entries, totalQuantity, totalValue, count: affectedProducts.length, carryover, productionSummary }
}

// À appeler périodiquement côté serveur (voir server.js). Contrairement à l'ancien
// checkAutoClosing() client (qui ne s'exécutait que si un navigateur avait la page Stock
// ouverte), celui-ci tourne dans le processus Node tant que le serveur est en vie — donc
// même la nuit, sans personne connecté.
async function checkServerAutoClosing() {
  const [rows] = await pool.query('SELECT clear_time, last_cleared_date FROM eod_settings WHERE id = 1')
  const settings = rows[0] || { clear_time: '22:00', last_cleared_date: null }
  const today = new Date().toISOString().slice(0, 10)
  if (settings.last_cleared_date && new Date(settings.last_cleared_date).toISOString().slice(0, 10) === today) return false

  const [h, m] = (settings.clear_time || '22:00').split(':').map(Number)
  const now = new Date()
  const cutoff = new Date()
  cutoff.setHours(h, m, 0, 0)
  if (now < cutoff) return false

  const catalog = await getServerCatalog()
  const affectedProducts = catalog.filter((p) =>
    PERISHABLE_CATEGORIES.includes(p.category) ||
    (p.category === 'millefeuille' && PERISHABLE_MILLEFEUILLE_IDS.includes(p.id))
  )
  await performClear({ type: 'soir', affectedProducts, fullCatalog: catalog })
  console.log(`[EOD] Clôture automatique du soir effectuée côté serveur (${today})`)
  return true
}

module.exports = {
  adjustStock, setStock, getStockMap, nextTicketNumber, safeJsonParse,
  performClear, checkServerAutoClosing, getServerCatalog,
}
