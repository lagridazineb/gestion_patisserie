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

// ✅ ADMIN : Changer le code de n'importe quel utilisateur (préparateurs, caissiers, admin)
router.put('/change-code/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le code doit contenir au moins 4 caractères' })
    }
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId])
    res.json({ success: true, message: 'Code mis à jour avec succès' })
  } catch (error) {
    console.error('Erreur PUT /api/auth/change-code :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ✅ ADMIN : Changer son propre code
router.put('/change-my-code', authMiddleware, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le code doit contenir au moins 4 caractères' })
    }
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Code actuel incorrect' })
    
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id])
    res.json({ success: true, message: 'Votre code a été mis à jour' })
  } catch (error) {
    console.error('Erreur PUT /api/auth/change-my-code :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
