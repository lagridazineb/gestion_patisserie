import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const apiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('diana_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('diana_token')
      localStorage.removeItem('diana_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
