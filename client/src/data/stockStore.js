import apiClient from '../api/client'
import { ALL_PRODUCTS, PLATEAU_COMPOSITION, AMANDE_KG_ID, SABLE_KG_ID } from './products'

// --- Stock ---
export async function getStock() {
  const { data } = await apiClient.get('/stock')
  return data.stock
}

export async function setProductStock(productId, value) {
  const { data } = await apiClient.put(`/stock/${productId}`, { value })
  return data.value
}

export async function adjustStock(productId, delta) {
  const { data } = await apiClient.post(`/stock/${productId}/adjust`, { delta })
  return data.value
}

// Ajoute `delta` (par défaut 1000) au stock de chaque produit de la liste — utilisé par le
// bouton "Stock" (admin) pour réapprovisionner en masse toutes les catégories d'un coup.
export async function addStockToProducts(productIds, delta = 1000) {
  const { data } = await apiClient.post('/stock/bulk-add', { productIds, delta })
  return data
}

// --- Production (préparateurs) ---
export async function getProductionLog(atelier, date) {
  const params = {}
  if (atelier) params.atelier = atelier
  if (date) params.date = date
  const { data } = await apiClient.get('/production', { params })
  return data.productions.map((p) => ({
    id: p.id, productId: p.product_id, product: p.product_name, quantity: Number(p.quantity),
    category: p.category, price: p.price !== null ? Number(p.price) : null, atelier: p.atelier,
    user: p.user_name, date: p.production_date, time: p.production_time, timestamp: p.created_at,
  }))
}

// `entry.image`, si fourni par l'appelant (qui connaît déjà le produit via son propre catalogue
// fusionné base+personnalisés), est utilisé en priorité. Sinon, on retombe sur une recherche
// dans le catalogue de base — mais celle-ci échoue silencieusement (image null) pour tout
// produit personnalisé, d'où l'intérêt de toujours fournir `entry.image` quand on l'a.
export async function addProduction(entry) {
  let image = entry.image
  if (image === undefined) {
    const baseProduct = ALL_PRODUCTS.find((p) => p.id === entry.productId)
    image = baseProduct?.image || null
  }
  const { data } = await apiClient.post('/production', { ...entry, image })
  return data
}

export async function removeProductionEntry(id) {
  await apiClient.delete(`/production/${id}`)
  return { success: true }
}

export async function getActiveFrigoBatches() {
  const { data } = await apiClient.get('/production/frigo-batches')
  return data.batches.map((b) => ({
    id: b.id, productionEntryId: b.production_entry_id, baseProductId: b.base_product_id,
    name: b.name, price: Number(b.price), weightKg: b.weight_kg !== null ? Number(b.weight_kg) : null,
    unit: 'piece', category: 'gateaux_kg', image: b.image, createdAt: b.created_at,
  }))
}

// Stock "virtuel" d'un plateau Gâteau Marocain : dérivé du stock d'Amande/Sable disponible
// selon sa composition (pas de stock propre pour le plateau lui-même). Fonction pure.
export function getPlateauAvailableStock(stock, productId) {
  const composition = PLATEAU_COMPOSITION[productId]
  if (!composition) return null
  const limits = []
  if (composition.amandeKg > 0) limits.push(Math.floor((stock[AMANDE_KG_ID] || 0) / composition.amandeKg))
  if (composition.sableKg > 0) limits.push(Math.floor((stock[SABLE_KG_ID] || 0) / composition.sableKg))
  return limits.length ? Math.min(...limits) : 0
}

// --- Numérotation des tickets ---
export async function peekNextTicketNumber() {
  const { data } = await apiClient.get('/sales/next-ticket-number')
  return data.nextTicketNumber
}

// --- Ventes (caisse) ---
export async function getSalesLog() {
  const { data } = await apiClient.get('/sales')
  return data.sales
}

export async function recordSale(order, paymentType = null) {
  const { data } = await apiClient.post('/sales', { items: order, paymentType })
  return data.sale
}

export async function findSaleByTicket(ticketNumber) {
  const n = parseInt(ticketNumber, 10)
  if (isNaN(n)) return null
  try {
    const { data } = await apiClient.get(`/sales/by-ticket/${n}`)
    return data.sale
  } catch (e) {
    return null
  }
}

export function getRefundableQty(sale, itemId) {
  const item = sale.items.find((i) => i.id === itemId)
  if (!item) return 0
  const already = (sale.refundedQty && sale.refundedQty[itemId]) || 0
  return Math.max(0, item.qty - already)
}

export async function processRefund(ticketNumber, refundItems) {
  try {
    const { data } = await apiClient.post(`/sales/${ticketNumber}/refund`, { items: refundItems })
    return { success: true, amount: data.amount, sale: data.sale }
  } catch (e) {
    return { success: false, error: e.response?.data?.error || 'Erreur serveur' }
  }
}

// --- Commandes / réservations ---
export async function getReservations() {
  const { data } = await apiClient.get('/reservations')
  return data.reservations
}

export async function addReservation(entry) {
  const { data } = await apiClient.post('/reservations', entry)
  return data.reservation
}

export async function findReservationByTicket(ticketNumber) {
  const n = parseInt(ticketNumber, 10)
  if (isNaN(n)) return null
  try {
    const { data } = await apiClient.get(`/reservations/by-ticket/${n}`)
    return data.reservation
  } catch (e) {
    return null
  }
}

export async function paySoldeReservation(reservationId, paymentMode) {
  try {
    const { data } = await apiClient.post(`/reservations/${reservationId}/solde`, { paymentMode })
    return { success: true, reservation: data.reservation }
  } catch (e) {
    return { success: false, error: e.response?.data?.error || 'Erreur serveur' }
  }
}

// Liste des ateliers (catégories) concernés par une réservation. Fonction pure.
export function getReservationAteliers(reservation) {
  return [...new Set((reservation.items || []).map((i) => i.category).filter(Boolean))]
}

// Une commande est "prête" seulement quand TOUS les ateliers concernés ont terminé. Fonction pure.
export function isReservationFullyReady(reservation) {
  const ateliers = getReservationAteliers(reservation)
  if (ateliers.length === 0) return false
  return ateliers.every((a) => reservation.doneByAtelier && reservation.doneByAtelier[a])
}

// Appelé par un préparateur quand il a terminé sa partie de la commande
export async function markAtelierDone(reservationId, atelier) {
  const { data } = await apiClient.patch(`/reservations/${reservationId}/atelier`, { atelier })
  return data.reservation
}

export async function toggleReservationReady(id) {
  const { data } = await apiClient.patch(`/reservations/${id}/ready`)
  return data
}

export async function removeReservation(id) {
  await apiClient.delete(`/reservations/${id}`)
  return { success: true }
}

// Réservations en attente de préparation pour un atelier donné (tâches à faire)
export async function getAtelierTasks(atelier) {
  const reservations = await getReservations()
  return reservations.filter((r) =>
    getReservationAteliers(r).includes(atelier) && !(r.doneByAtelier && r.doneByAtelier[atelier])
  )
}

// Commandes que ce préparateur a déjà marquées "Terminé", mais pas encore encaissées.
// Dès qu'une commande est encaissée (solde payé), elle disparaît immédiatement de cette
// liste chez tous les préparateurs concernés — elle reste consultable côté Admin/Caissier.
export async function getAtelierDoneTasks(atelier) {
  const reservations = await getReservations()
  return reservations.filter((r) =>
    getReservationAteliers(r).includes(atelier) && r.doneByAtelier && r.doneByAtelier[atelier] && !r.soldePaid
  )
}

export function getCommandeRefundableQty(reservation, itemId) {
  const item = reservation.items.find((i) => i.id === itemId)
  if (!item) return 0
  const refunded = (reservation.refundedQty || {})[itemId] || 0
  return Math.max(0, item.qty - refunded)
}

export async function processCommandeRefund(ticketNumber, refundItems) {
  try {
    const { data } = await apiClient.post(`/reservations/${ticketNumber}/refund`, { items: refundItems })
    return { success: true, amount: data.amount, reservation: data.reservation }
  } catch (e) {
    return { success: false, error: e.response?.data?.error || 'Erreur serveur' }
  }
}

// --- Remboursements (journal complet, ventes + commandes) ---
export async function getRefunds() {
  const { data } = await apiClient.get('/refunds')
  return data.refunds
}

// --- Achats (dépenses fournisseurs/ingrédients) ---
export async function getPurchases() {
  const { data } = await apiClient.get('/purchases')
  return data.purchases
}

export async function addPurchase(entry) {
  const { data } = await apiClient.post('/purchases', entry)
  return data
}

export async function removePurchase(id) {
  await apiClient.delete(`/purchases/${id}`)
  return { success: true }
}

// --- Bilan ---
export async function getSalesTrend(days = 7) {
  const { data } = await apiClient.get('/bilan/sales-trend', { params: { days } })
  return data.trend
}

export async function getDailyBilan(dateStr) {
  const { data } = await apiClient.get('/bilan/daily', { params: dateStr ? { date: dateStr } : {} })
  return data
}

export async function getCommandesBilan(dateStr) {
  const { data } = await apiClient.get('/bilan/commandes', { params: dateStr ? { date: dateStr } : {} })
  return data
}

// Bilan par utilisateur (caissier1, caissier2, admin...) : ventes + commandes + détail par
// catégorie. Sans `dateStr` -> tout l'historique ; avec `dateStr` -> uniquement ce jour-là.
export async function getBilanByUser(dateStr) {
  const { data } = await apiClient.get('/bilan/by-user', { params: dateStr ? { date: dateStr } : {} })
  return data
}

// --- Clôture du soir (remise à zéro du stock des produits périssables) ---
export const PERISHABLE_CATEGORIES = ['pain', 'viennoiserie', 'sale']
export const PERISHABLE_MILLEFEUILLE_IDS = ['m1b']

export async function getEodSettings() {
  const { data } = await apiClient.get('/stock/eod-settings')
  return data
}

export async function setEodTime(time) {
  await apiClient.put('/stock/eod-settings', { time })
  return { time }
}

export async function getStockClearLog() {
  const { data } = await apiClient.get('/stock/clear-log')
  return data.log.map((l) => ({
    id: l.id, type: l.type, timestamp: l.created_at,
    entries: typeof l.entries === 'string' ? JSON.parse(l.entries) : l.entries,
    totalQuantity: Number(l.total_quantity), totalValue: Number(l.total_value), productCount: l.product_count,
  }))
}

// `catalog` : catalogue COMPLET et À JOUR (base + produits personnalisés + éditions), tel que
// vu par l'écran Stock — généralement `mergeProductOverlay(productOverlay)`. Sans ce paramètre,
// on retombe sur le catalogue de base uniquement (rétro-compatible), mais dans ce cas les
// produits personnalisés (ex: "Tranche 18") ne sont ni vidés, ni comptés dans le retour —
// c'est pour corriger exactement ce bug que le paramètre a été ajouté.
export async function clearPerishableStock(catalog = ALL_PRODUCTS) {
  const affected = catalog.filter((p) =>
    PERISHABLE_CATEGORIES.includes(p.category) ||
    (p.category === 'millefeuille' && PERISHABLE_MILLEFEUILLE_IDS.includes(p.id))
  )
  const fullCatalog = catalog.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price }))
  const { data } = await apiClient.post('/stock/clear', { type: 'soir', affectedProducts: affected, fullCatalog })
  return data
}

export async function resetAllStock(catalog = ALL_PRODUCTS) {
  const { data } = await apiClient.post('/stock/clear', { type: 'complet', affectedProducts: catalog })
  return data
}

// À appeler périodiquement (ex: toutes les minutes) pendant que l'app est ouverte.
// `catalog` : même catalogue complet (base + custom + éditions) à transmettre à clearPerishableStock —
// voir le commentaire sur clearPerishableStock ci-dessus.
export async function checkAutoClosing(catalog = ALL_PRODUCTS) {
  const settings = await getEodSettings()
  const today = new Date().toISOString().slice(0, 10)
  if (settings.lastClearedDate === today) return false
  const [h, m] = (settings.time || '22:00').split(':').map(Number)
  const now = new Date()
  const cutoff = new Date()
  cutoff.setHours(h, m, 0, 0)
  if (now >= cutoff) {
    await clearPerishableStock(catalog)
    return true
  }
  return false
}

// --- Fond de caisse ---
export async function getFondsCaisse() {
  const { data } = await apiClient.get('/fonds-caisse')
  return data.fonds
}

export async function addFondCaisse(amount, note = '') {
  const { data } = await apiClient.post('/fonds-caisse', { amount, note })
  return data
}

export function sameDay(isoString, dateStr) {
  return new Date(isoString).toISOString().slice(0, 10) === dateStr
}

// --- Rziza (fournisseur externe) ---
export async function getRzizaDeliveries() {
  const { data } = await apiClient.get('/rziza')
  return data.deliveries
}

// --- Retours caisse (voir aussi clearPerishableStock ci-dessus, qui calcule le "carryover"
// chaque soir) : renvoie le retour du jour demandé + celui du jour précédent.
export async function getRetours(dateStr) {
  const { data } = await apiClient.get('/retours', { params: dateStr ? { date: dateStr } : {} })
  return data // { current, previous }
}

export async function addRzizaDelivery({ quantity, prixAchat = 3.5, prixVente = 5.5 }) {
  const { data } = await apiClient.post('/rziza', { quantity, prixAchat, prixVente })
  return data
}

export async function removeRzizaDelivery(id) {
  await apiClient.delete(`/rziza/${id}`)
  return { success: true }
}


export function subscribeToStockUpdates(callback, intervalMs = 8000) {
  const id = setInterval(() => callback(), intervalMs)
  // Rafraîchit aussi immédiatement quand l'onglet redevient visible (ex: on revient sur l'appli)
  const onVisible = () => { if (document.visibilityState === 'visible') callback() }
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
