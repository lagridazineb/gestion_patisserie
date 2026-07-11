import axios from 'axios'

// En local (npm run dev), VITE_API_URL n'est pas défini -> on retombe sur le serveur local.
// En production (Render), VITE_API_URL doit être configuré dans les variables d'environnement
// du Static Site, ex: https://diana-server.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const apiClient = axios.create({ baseURL })

// Attache automatiquement le token JWT (s'il existe) à chaque requête sortante.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('diana_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si le token est invalide/expiré, le serveur répond 401 -> on déconnecte proprement
// au lieu de laisser l'app dans un état incohérent.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('diana_token')
      localStorage.removeItem('diana_user')
    }
    return Promise.reject(error)
  }
)

export default apiClient
