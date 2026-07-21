const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

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

    // Un compte caissier ne peut être connecté qu'à un seul endroit à la fois : s'il a déjà
    // une session de caisse ouverte (donc déjà connecté ailleurs), on refuse la connexion
    // plutôt que de laisser deux postes travailler en même temps sur le même compte.
    if (user.role === 'caissier') {
      const [openSessions] = await pool.query(
        "SELECT id FROM cashier_sessions WHERE user_id = ? AND status = 'open' LIMIT 1",
        [user.id]
      )
      if (openSessions.length > 0) {
        return res.status(409).json({ error: 'Ce compte est déjà connecté sur un autre poste. Il doit d\'abord vider la caisse là-bas avant de se reconnecter ici.' })
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, atelier: user.atelier },
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

module.exports = router
