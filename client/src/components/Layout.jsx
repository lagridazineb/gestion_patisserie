import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { FiHome, FiBarChart2, FiBox, FiShoppingBag, FiClipboard, FiClock, FiDollarSign, FiLogOut, FiMenu, FiX, FiUser, FiChevronRight, FiLogIn, FiRotateCcw, FiShoppingCart, FiPieChart, FiCalendar, FiTrash2, FiArrowLeft } from 'react-icons/fi'

const adminNavItems = [
  { path: '/', icon: FiHome, label: 'Caisse' },
  { path: '/bilan', icon: FiPieChart, label: 'Bilan & Dépôts' },
  { path: '/bilan-caisse', icon: FiCalendar, label: 'Commande' },
  { path: '/commandes/suivi', icon: FiClipboard, label: 'Suivi commandes' },
  { path: '/stock', icon: FiBox, label: 'Stock' },
  { path: '/stock-vide', icon: FiTrash2, label: 'Stock vidé' },
  { path: '/produits', icon: FiShoppingBag, label: 'Produits' },
  { path: '/historique', icon: FiClock, label: 'Historique' },
  { path: '/ventes', icon: FiDollarSign, label: 'Ventes' },
  { path: '/remboursement', icon: FiRotateCcw, label: 'Remboursement' },
  { path: '/achats', icon: FiShoppingCart, label: 'Achats' },
]

const preparateurNavItems = [
  { path: '/preparateur', icon: FiBox, label: 'Production' },
]

const caissierNavItems = [
  { path: '/', icon: FiHome, label: 'Caisse' },
  { path: '/commandes', icon: FiCalendar, label: 'Commande' },
  { path: '/commandes/suivi', icon: FiClipboard, label: 'Suivi commandes' },
]

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = user?.role === 'admin' ? adminNavItems : user?.role === 'caissier' ? caissierNavItems : preparateurNavItems

  const handleLogout = () => { logout(); setSidebarOpen(false); navigate('/') }
  const handleLogin = () => { setSidebarOpen(false); navigate('/login') }

  return (
    <div className="flex h-screen bg-diana-dark overflow-hidden">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] bg-diana-card border-r border-diana-border flex flex-col"
          >
            <div className="p-6 border-b border-diana-border">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Pâtisserie Dianna" className="w-14 h-14 object-contain shrink-0" />
                <div>
                  <h1 className="font-fraunces text-xl font-medium text-diana-cream">Pâtisserie Dianna</h1>
                  <p className="text-[10px] tracking-[2px] uppercase text-diana-brown">Boulangerie · Café</p>
                </div>
              </div>
            </div>
            {isAuthenticated ? (
              <>
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 min-h-0">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150
                          ${isActive ? 'bg-diana-gold/15 text-diana-gold border border-diana-gold/20' : 'text-diana-brownLight hover:text-diana-cream hover:bg-diana-border/50'}`}>
                        <item.icon size={18} />
                        <span>{item.label}</span>
                        {isActive && <FiChevronRight size={14} className="ml-auto" />}
                      </Link>
                    )
                  })}
                </div>
                <div className="p-4 border-t border-diana-border">
                  <div className="flex items-center gap-3 px-3 py-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-diana-gold/20 flex items-center justify-center">
                      <FiUser size={14} className="text-diana-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-diana-cream">{user?.name}</p>
                      <p className="text-xs text-diana-brown capitalize">{user?.role === 'admin' ? 'Administrateur' : 'Préparateur'}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-diana-accentLight hover:bg-diana-accent/10 transition-colors">
                    <FiLogOut size={16} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FiUser size={32} className="text-diana-brown mb-3 opacity-50" />
                <p className="text-sm text-diana-brown mb-5">Connectez-vous en tant qu'administrateur ou préparateur pour accéder à votre espace.</p>
                <button onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-2 bg-diana-gold text-diana-darker py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
                  <FiLogIn size={16} /> Connexion
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-3 bg-diana-card border-b border-diana-border">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-diana-cream"><FiMenu size={22} /></button>
            {user?.role === 'admin' && location.pathname !== '/' && (
              <Link to="/" title="Retour à la Caisse"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-diana-brownLight hover:text-diana-gold hover:bg-diana-border/50 transition-colors text-xs font-medium">
                <FiArrowLeft size={16} /> <span className="hidden sm:inline">Caisse</span>
              </Link>
            )}
          </div>
          <span className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Pâtisserie Dianna" className="w-16 h-16 object-contain" />
            <span className="font-fraunces text-lg text-diana-cream hidden sm:block">Pâtisserie Dianna</span>
          </span>
          <div className="flex flex-col items-end gap-1.5">
            {isAuthenticated ? (
              <Link to={user?.role === 'admin' ? '/bilan' : user?.role === 'preparateur' ? '/preparateur' : '/'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-diana-gold/15 border border-diana-gold/20 text-diana-gold text-xs font-medium">
                <FiUser size={14} /> {user?.name}
              </Link>
            ) : (
              <button onClick={handleLogin}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-diana-gold text-diana-darker text-xs sm:text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
                <FiLogIn size={14} /> Connexion
              </button>
            )}
            {location.pathname === '/' && (user?.role === 'admin' || user?.role === 'caissier') && (
              <Link to="/commandes"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-diana-dark text-diana-cream border border-diana-border text-xs font-medium hover:border-diana-gold/40 hover:text-diana-gold transition-colors">
                <FiClipboard size={14} /> Commande
              </Link>
            )}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto lg:overflow-hidden"><Outlet /></main>
      </div>
    </div>
  )
}