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

module.exports = { adjustStock, setStock, getStockMap, nextTicketNumber, safeJsonParse }
