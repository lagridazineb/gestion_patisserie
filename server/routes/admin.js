const express = require('express')
const bcrypt = require('bcryptjs')
const router = express.Router()
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// Réinitialisation complète des données de ventes/commandes/production/stock — pour "repartir
// de zéro" comme si le logiciel venait d'être installé. Les comptes utilisateurs (users) et le
// catalogue produits (défini dans le code, pas en base) ne sont JAMAIS touchés.
//
// Protégé par le mot de passe de l'admin qui déclenche l'action (même principe que "Vider la
// caisse"), car c'est irréversible : toutes les ventes, commandes, productions, stocks,
// remboursements, dépôts et l'historique des connexions sont définitivement supprimés.
router.post('/reset-all-data', authMiddleware, adminMiddleware, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Mot de passe requis' })

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id])
    if (!users[0]) return res.status(404).json({ error: 'Utilisateur introuvable' })
    const ok = await bcrypt.compare(password, users[0].password)
    if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' })

    // Tables "données d'exploitation" (ventes, commandes, production, stock, retours, dépôts,
    // sessions). Aucune n'a de clé étrangère vers les autres ici, donc l'ordre n'a pas
    // d'importance. `users` n'est jamais dans cette liste.
    const tables = [
      'sales', 'reservations', 'refunds', 'purchases',
      'production_entries', 'frigo_batches', 'stock_quantities', 'stock_clear_log',
      'retours_veille', 'retours_vidage', 'retours_caisse',
      'fonds_caisse', 'rziza_deliveries', 'cashier_sessions',
    ]

    await conn.beginTransaction()
    for (const t of tables) {
      await conn.query(`DELETE FROM ${t}`)
    }
    // Le numéro de ticket repart à 0 (le prochain ticket sera le n°1).
    await conn.query("UPDATE ticket_counter SET value = 0 WHERE id = 1")
    // Déconnecte tout le monde (jetons invalidés) pour repartir sur une base propre — sauf
    // l'admin qui vient de confirmer son mot de passe, qui reste connecté.
    await conn.query('UPDATE users SET session_token = NULL WHERE id != ?', [req.user.id])

    await conn.commit()
    res.json({ success: true })
  } catch (error) {
    await conn.rollback()
    console.error('Erreur POST /api/admin/reset-all-data :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  } finally {
    conn.release()
  }
})

module.exports = router
