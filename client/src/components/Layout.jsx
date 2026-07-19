import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { FiHome, FiBarChart2, FiBox, FiShoppingBag, FiClipboard, FiClock, FiDollarSign, FiLogOut, FiMenu, FiX, FiUser, FiUsers, FiChevronRight, FiLogIn, FiRotateCcw, FiShoppingCart, FiPieChart, FiCalendar, FiTrash2, FiArrowLeft, FiGlobe } from 'react-icons/fi'
import CodeConfirmModal from './CodeConfirmModal'
import { closeSession } from '../data/sessionsStore'

const adminNavItems = [
  { path: '/', icon: FiHome, key: 'caisse' },
  { path: '/bilan', icon: FiPieChart, key: 'bilan' },
  { path: '/bilan-caisse', icon: FiCalendar, key: 'commande' },
  { path: '/commandes/suivi', icon: FiClipboard, key: 'suiviCommandes' },
  { path: '/utilisateurs', icon: FiUsers, key: 'utilisateurs' },
  { path: '/stock', icon: FiBox, key: 'stock' },
  { path: '/stock-vide', icon: FiTrash2, key: 'stockVide' },
  { path: '/produits', icon: FiShoppingBag, key: 'produits' },
  { path: '/historique', icon: FiClock, key: 'historique' },
  { path: '/ventes', icon: FiDollarSign, key: 'ventes' },
  { path: '/remboursement', icon: FiRotateCcw, key: 'remboursement' },
  { path: '/achats', icon: FiShoppingCart, key: 'achats' },
]

const preparateurNavItems = [
  { path: '/preparateur', icon: FiBox, key: 'production' },
]

const caissierNavItems = [
  { path: '/', icon: FiHome, key: 'caisse' },
  { path: '/commandes', icon: FiCalendar, key: 'commande' },
  { path: '/commandes/suivi', icon: FiClipboard, key: 'suiviCommandes' },
]

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { t, lang, toggleLang } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutCode, setShowLogoutCode] = useState(false)
  const navItems = user?.role === 'admin' ? adminNavItems : user?.role === 'caissier' ? caissierNavItems : preparateurNavItems

  // La déconnexion nécessite d'abord le code (mot de passe) — voir CodeConfirmModal plus bas.
  const handleLogout = () => setShowLogoutCode(true)
  const confirmLogout = async (password) => {
    await closeSession(password) // lève une erreur si le code est incorrect (gérée par le modal)
    setShowLogoutCode(false)
    logout()
    setSidebarOpen(false)
    navigate('/')
  }
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
                <img src="/logo.png" alt={t('common.appName')} className="w-14 h-14 object-contain shrink-0" />
                <div>
                  <h1 className="font-fraunces text-xl font-medium text-diana-cream">{t('common.appName')}</h1>
                  <p className="text-[10px] tracking-[2px] uppercase text-diana-brown">{t('nav.boulangerieCafe')}</p>
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
                        <span>{t(`nav.${item.key}`)}</span>
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
                      <p className="text-xs text-diana-brown capitalize">{user?.role === 'admin' ? t('nav.administrateur') : user?.role === 'caissier' ? t('nav.caissier') : t('nav.preparateur')}</p>
                    </div>
                  </div>
                  <button onClick={toggleLang}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-diana-brownLight hover:bg-diana-border/50 hover:text-diana-cream transition-colors mb-1">
                    <FiGlobe size={16} />
                    <span>{t('common.langButtonLabel')}</span>
                  </button>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-diana-accentLight hover:bg-diana-accent/10 transition-colors">
                    <FiLogOut size={16} />
                    <span>{t('nav.deconnexion')}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FiUser size={32} className="text-diana-brown mb-3 opacity-50" />
                <p className="text-sm text-diana-brown mb-5">{t('nav.connecteMessage')}</p>
                <button onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-2 bg-diana-gold text-diana-darker py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98] mb-3">
                  <FiLogIn size={16} /> {t('nav.connexion')}
                </button>
                <button onClick={toggleLang}
                  className="w-full flex items-center justify-center gap-2 bg-diana-dark border border-diana-border text-diana-brownLight py-2.5 rounded-xl text-sm font-medium hover:text-diana-cream hover:border-diana-gold/30 transition-colors">
                  <FiGlobe size={15} /> {t('common.langButtonLabel')}
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
              <Link to="/" title={t('nav.retourCaisse')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-diana-brownLight hover:text-diana-gold hover:bg-diana-border/50 transition-colors text-xs font-medium">
                <FiArrowLeft size={16} /> <span className="hidden sm:inline">{t('nav.caisse')}</span>
              </Link>
            )}
          </div>
          <span className="flex items-center gap-2.5">
            <img src="/logo.png" alt={t('common.appName')} className="w-16 h-16 object-contain" />
            <span className="font-fraunces text-lg text-diana-cream hidden sm:block">{t('common.appName')}</span>
          </span>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <button onClick={toggleLang} title={t('common.langButtonLabel')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-diana-dark border border-diana-border text-diana-brownLight text-xs font-semibold hover:text-diana-gold hover:border-diana-gold/40 transition-colors">
                <FiGlobe size={14} /> {lang === 'fr' ? 'AR' : 'FR'}
              </button>
              {isAuthenticated ? (
                <Link to={user?.role === 'admin' ? '/bilan' : user?.role === 'preparateur' ? '/preparateur' : '/'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-diana-gold/15 border border-diana-gold/20 text-diana-gold text-xs font-medium">
                  <FiUser size={14} /> {user?.name}
                </Link>
              ) : (
                <button onClick={handleLogin}
                  className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-diana-gold text-diana-darker text-xs sm:text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
                  <FiLogIn size={14} /> {t('nav.connexion')}
                </button>
              )}
            </div>
            {location.pathname === '/' && (user?.role === 'admin' || user?.role === 'caissier') && (
              <Link to="/commandes"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-diana-dark text-diana-cream border border-diana-border text-xs font-medium hover:border-diana-gold/40 hover:text-diana-gold transition-colors">
                <FiClipboard size={14} /> {t('nav.commande')}
              </Link>
            )}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto lg:overflow-hidden"><Outlet /></main>
      </div>

      <CodeConfirmModal
        open={showLogoutCode}
        title="Confirmer la déconnexion"
        description="Entrez votre code (mot de passe) pour vous déconnecter."
        confirmLabel="Se déconnecter"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutCode(false)}
      />
    </div>
  )
}
