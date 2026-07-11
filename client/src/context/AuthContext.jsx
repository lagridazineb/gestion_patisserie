import React, { createContext, useContext, useState, useEffect } from 'react'
import { loginApi, fetchCurrentUser } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Au chargement de l'app : si un token existe déjà, on vérifie qu'il est toujours
    // valide auprès du serveur (plutôt que de faire confiance à ce qui est en localStorage,
    // qui peut être périmé si le token a expiré ou si le compte a changé côté serveur).
    async function restoreSession() {
      const token = localStorage.getItem('diana_token')
      if (!token) { setIsLoading(false); return }
      try {
        const currentUser = await fetchCurrentUser()
        setUser(currentUser)
        localStorage.setItem('diana_user', JSON.stringify(currentUser))
      } catch (e) {
        localStorage.removeItem('diana_token')
        localStorage.removeItem('diana_user')
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = async (email, password) => {
    try {
      const { token, user: loggedInUser } = await loginApi(email, password)
      localStorage.setItem('diana_token', token)
      localStorage.setItem('diana_user', JSON.stringify(loggedInUser))
      setUser(loggedInUser)
      return { success: true, user: loggedInUser }
    } catch (error) {
      const message = error.response?.data?.error || 'Impossible de contacter le serveur'
      return { success: false, error: message }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('diana_token')
    localStorage.removeItem('diana_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
