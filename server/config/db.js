const mysql = require('mysql2/promise')

// Pool de connexions partagé par toutes les routes. mysql2/promise permet d'utiliser
// async/await directement (pool.query(...)) au lieu de callbacks.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Renvoie les colonnes DATE/DATETIME/TIMESTAMP sous forme de texte plutôt que d'objets Date JS,
  // pour rester cohérent avec le code (comparaisons de dates en chaînes ISO, ex: 'YYYY-MM-DD').
  dateStrings: true,
  // Nécessaire pour la plupart des hébergeurs MySQL managés (ex: certains add-ons Render/PlanetScale/Railway)
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

// Petit helper pour vérifier la connexion au démarrage du serveur (voir server.js).
async function testConnection() {
  const conn = await pool.getConnection()
  await conn.ping()
  conn.release()
}

module.exports = { pool, testConnection }
