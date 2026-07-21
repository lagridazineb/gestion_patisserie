const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { pool } = require('../config/db')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

    // Un compte ne peut être actif que sur UN SEUL appareil à la fois. On ne bloque jamais la
    // nouvelle connexion : on génère un nouveau jeton de session et on l'enregistre en base,
    // ce qui invalide automatiquement l'ancien appareil (voir authMiddleware) dès sa prochaine
    // requête — il sera déconnecté tout seul, sans rien faire de son côté.
    const sessionToken = crypto.randomUUID()
    await pool.query('UPDATE users SET session_token = ? WHERE id = ?', [sessionToken, user.id])

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, atelier: user.atelier, sid: sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, atelier: user.atelier },
    })
  } catch (error) {
    console.error('Erreur /api/auth/login :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Renvoie l'utilisateur courant à partir du token (utile pour re-vérifier la session
// au chargement de l'app, sans redemander le mot de passe).
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, role, atelier FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    )
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json({ user })
  } catch (error) {
    console.error('Erreur /api/auth/me :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Liste des utilisateurs (admin uniquement) — pour la page "Utilisateurs / Codes".
// Ne renvoie jamais le mot de passe/hash.
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, name, role, atelier FROM users ORDER BY role, name'
    )
    res.json({ users: rows })
  } catch (error) {
    console.error('Erreur /api/auth/users :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Changer le code (mot de passe) d'un utilisateur — préparateur, caissier, ou l'admin
// lui-même. Réservé à l'admin. Invalide aussi la session en cours de cet utilisateur
// (il devra se reconnecter avec le nouveau code).
router.put('/users/:id/password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body
    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Le code doit contenir au moins 4 caractères.' })
    }
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id])
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const hashed = await bcrypt.hash(String(password), 10)
    await pool.query('UPDATE users SET password = ?, session_token = NULL WHERE id = ?', [hashed, id])
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur /api/auth/users/:id/password :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
