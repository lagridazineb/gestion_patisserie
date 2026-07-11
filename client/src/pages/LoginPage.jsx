import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { addNotification } = useNotification()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const result = await login(email, password)
    setIsLoading(false)
    if (result.success) {
      addNotification('Connexion réussie', 'success')
      const role = result.user?.role
      navigate(role === 'preparateur' ? '/preparateur' : role === 'caissier' ? '/' : '/bilan')
    } else {
      addNotification(result.error, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-diana-dark relative flex items-center justify-center p-4 overflow-hidden">
      {/* Décor subtil */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #E8C98F 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-diana-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-diana-accent/10 blur-3xl" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-4">
            <img src="/logo.png" alt="Pâtisserie Dianna" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="font-fraunces text-3xl font-medium text-diana-cream mb-1">Pâtisserie Dianna</h1>
          <p className="text-xs tracking-[3px] uppercase text-diana-brown">Système de gestion</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-8 shadow-gold-lg">
          <h2 className="font-fraunces text-xl text-diana-cream mb-6 text-center">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-diana-brown mb-1.5 ml-1">Email</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={16} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com"
                  className="w-full pl-11 pr-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" required autoComplete="username" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-diana-brown mb-1.5 ml-1">Mot de passe</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-diana-brown" size={16} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 transition-colors text-sm" required autoComplete="current-password" />
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-diana-gold text-diana-dark py-3.5 rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98] shadow-gold">
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-diana-dark/30 border-t-diana-dark rounded-full" />
              ) : (<><FiLogIn size={16} /> Se connecter</>)}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}
