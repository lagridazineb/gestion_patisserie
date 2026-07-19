const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const dotenv = require('dotenv')
const morgan = require('morgan')

dotenv.config()

const { pool, testConnection } = require('./config/db')

const app = express()
const PORT = process.env.PORT || 3001
app.set('trust proxy', 1)

// En-têtes de sécurité standards (cache le framework utilisé, bloque le MIME-sniffing,
// désactive le chargement dans une iframe étrangère, etc.)
app.use(helmet())

// CORS restreint : seul ton frontend (défini par CLIENT_URL sur Render) peut appeler l'API.
// En dev, on autorise aussi localhost:5173 (Vite) pour ne pas se bloquer soi-même.
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean)
app.use(cors({
  origin: (origin, callback) => {
    // origin est undefined pour les appels sans navigateur (curl, apps mobiles, health checks) -> on autorise
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origine non autorisée par CORS'))
  },
  credentials: true,
}))

app.use(express.json({ limit: '15mb' }))
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'))

// Limite le nombre de tentatives de connexion pour freiner le brute-force sur /api/auth/login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 tentatives / IP / 15 min
  message: { error: 'Trop de tentatives de connexion. Réessaie dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth/login', loginLimiter)

app.use('/api/auth', require('./routes/auth'))
app.use('/api/products', require('./routes/products'))
app.use('/api/orders', require('./routes/orders'))
app.use('/api/stock', require('./routes/stock'))
app.use('/api/production', require('./routes/production'))
app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/reservations', require('./routes/reservations'))
app.use('/api/sales', require('./routes/sales'))
app.use('/api/refunds', require('./routes/refunds'))
app.use('/api/purchases', require('./routes/purchases'))
app.use('/api/fonds-caisse', require('./routes/fondsCaisse'))
app.use('/api/rziza', require('./routes/rziza'))
app.use('/api/bilan', require('./routes/bilan'))
app.use('/api/sessions', require('./routes/sessions'))

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'OK', db: 'connected', timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(500).json({ status: 'ERROR', db: 'disconnected' })
  }
})

// Gestionnaire d'erreurs global : le détail de l'erreur (stack, requête SQL, etc.) reste
// dans les logs serveur uniquement. Le client ne reçoit jamais que ce message générique.
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: 'Une erreur est survenue' })
})

app.listen(PORT, async () => {
  console.log(`\n🥐  Pâtisserie Dianna Server`)
  console.log(`   Running on http://localhost:${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`)
  try {
    await testConnection()
    console.log('✅  Connexion à la base de données MySQL réussie\n')
  } catch (err) {
    console.error('❌  Impossible de se connecter à la base de données')
    console.error('   Code erreur :', err.code || '(aucun)')
    console.error('   Message     :', err.message || '(aucun)')
    console.error('   DB_HOST =', JSON.stringify(process.env.DB_HOST))
    console.error('   DB_USER =', JSON.stringify(process.env.DB_USER))
    console.error('   DB_NAME =', JSON.stringify(process.env.DB_NAME))
    console.error('   Vérifie que MySQL tourne et que server/.env contient les bons identifiants\n')
  }
})

module.exports = app
