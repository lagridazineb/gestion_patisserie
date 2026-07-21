const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token manquant' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Un seul appareil actif par compte : si un autre appareil s'est reconnecté sur ce même
    // compte depuis, son jeton de session (sid) a remplacé celui-ci en base — on refuse alors
    // cette requête pour forcer la déconnexion de CET appareil-ci (l'ancien), sans jamais
    // empêcher la nouvelle connexion de fonctionner ailleurs.
    if (decoded.sid) {
      const [rows] = await pool.query('SELECT session_token FROM users WHERE id = ? LIMIT 1', [decoded.id])
      const currentSid = rows[0]?.session_token
      if (!currentSid || currentSid !== decoded.sid) {
        return res.status(401).json({ error: 'Ce compte a été connecté sur un autre appareil.', code: 'SESSION_REPLACED' })
      }
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Accès refusé - Administrateur requis' })
  next()
}

const preparateurMiddleware = (req, res, next) => {
  if (req.user?.role !== 'preparateur' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' })
  next()
}

module.exports = { authMiddleware, adminMiddleware, preparateurMiddleware }
