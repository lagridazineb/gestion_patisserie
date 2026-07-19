import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FiCalendar, FiUser, FiPackage, FiTrendingUp, FiClock, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { getBilanByUser, subscribeToStockUpdates } from '../data/stockStore'
import { getSessionsHistory } from '../data/sessionsStore'
import { findCategory } from '../data/products'
import { getCategoryLabel } from '../i18n/productNames'
import { useLanguage } from '../context/LanguageContext'

function pillClass(active) {
  return `px-4 py-2 rounded-xl text-xs font-medium transition-all ${
    active ? 'bg-diana-gold text-diana-dark' : 'bg-diana-card border border-diana-border text-diana-brown hover:text-diana-cream'
  }`
}

export default function UtilisateursPage() {
  const { lang } = useLanguage()
  const [mode, setMode] = useState('today') // 'today' | 'date' | 'all'
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])

  const refresh = useCallback(async () => {
    const d = mode === 'all' ? null : (mode === 'date' ? date : new Date().toISOString().slice(0, 10))
    const [result, sessionsResult] = await Promise.all([getBilanByUser(d), getSessionsHistory()])
    setData(result)
    setSessions(sessionsResult)
  }, [mode, date])

  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const categoryLabel = (catId) => {
    if (catId === 'autre') return lang === 'ar' ? 'أخرى' : 'Autre'
    const cat = findCategory(catId)
    return cat ? getCategoryLabel(cat, lang) : catId
  }

  if (!data) return null

  const hasUnattributed = data.unattributed.nbVentes > 0 || data.unattributed.nbCommandes > 0

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Admin</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Utilisateurs</h2>
            <p className="text-sm text-diana-brown mt-1">Ventes et commandes détaillées par caissier / admin</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <button onClick={() => setMode('today')} className={pillClass(mode === 'today')}>Aujourd'hui</button>
          <button onClick={() => setMode('date')} className={pillClass(mode === 'date')}>Choisir une date</button>
          <button onClick={() => setMode('all')} className={pillClass(mode === 'all')}>Tout l'historique</button>
          {mode === 'date' && (
            <div className="flex items-center gap-2">
              <FiCalendar className="text-diana-brown" size={15} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {data.users.map((u, i) => (
            <UserCard key={u.id} user={u} index={i} categoryLabel={categoryLabel}
              sessions={sessions.filter((s) => s.userId === u.id)} />
          ))}
          {hasUnattributed && (
            <UserCard
              user={{ name: 'Ventes / commandes non attribuées', role: null, ...data.unattributed }}
              index={data.users.length}
              categoryLabel={categoryLabel}
              muted
              roleText="Antérieures à ce suivi (avant l'ajout du suivi par utilisateur) — impossible de savoir quel caissier les a faites."
            />
          )}
          {data.users.length === 0 && !hasUnattributed && (
            <p className="text-sm italic text-diana-brownLight">Aucun utilisateur admin/caissier trouvé.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function UserCard({ user, index, categoryLabel, muted = false, roleText = null, sessions = [] }) {
  const [showSessions, setShowSessions] = useState(false)
  const roleLabel = roleText || (user.role === 'admin' ? 'Administrateur' : 'Caissier')
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`bg-diana-card border rounded-2xl p-6 ${muted ? 'border-diana-border/40 opacity-80' : 'border-diana-border'}`}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            muted ? 'bg-diana-border/30 text-diana-brown' : user.role === 'admin' ? 'bg-diana-gold/15 text-diana-gold' : 'bg-blue-500/10 text-blue-400'
          }`}>
            <FiUser size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-fraunces text-lg text-diana-cream truncate">{user.name}</p>
            <p className="text-xs text-diana-brown">{roleLabel}</p>
          </div>
        </div>
        <p className="font-fraunces text-2xl font-semibold text-diana-gold shrink-0">{user.totalGeneral.toFixed(2)} DH</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-diana-dark/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-diana-brown mb-1.5"><FiTrendingUp size={13} /><p className="text-xs">Ventes caisse</p></div>
          <p className="text-sm text-diana-cream">{user.nbVentes} vente{user.nbVentes !== 1 ? 's' : ''}</p>
          <p className="font-semibold text-diana-cream">{user.totalVentes.toFixed(2)} DH</p>
        </div>
        <div className="bg-diana-dark/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-diana-brown mb-1.5"><FiPackage size={13} /><p className="text-xs">Commandes</p></div>
          <p className="text-sm text-diana-cream">{user.nbCommandes} commande{user.nbCommandes !== 1 ? 's' : ''}</p>
          <p className="font-semibold text-diana-cream">{user.totalCommandes.toFixed(2)} DH</p>
        </div>
      </div>

      {user.categories.length === 0 ? (
        <p className="text-xs italic text-diana-brownLight">Aucune vente/commande sur cette période.</p>
      ) : (
        <div>
          <p className="text-[10px] tracking-[1.5px] uppercase text-diana-brown mb-2">Détail par catégorie</p>
          <div className="space-y-1.5">
            {user.categories.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span className="text-diana-brownLight">{categoryLabel(c.category)}</span>
                <span className="text-diana-cream font-medium">
                  {c.value.toFixed(2)} DH <span className="text-diana-brown text-xs">({c.qty})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-diana-border/50">
          <button onClick={() => setShowSessions((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-diana-brown hover:text-diana-gold transition-colors">
            <FiClock size={13} /> Connexions ({sessions.length})
            {showSessions ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          </button>
          {showSessions && (
            <div className="mt-3 space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="bg-diana-dark/30 rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-1.5 mb-1.5">
                    <span className="text-diana-cream font-medium">Entrée : {new Date(s.openedAt).toLocaleString('fr-FR')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      s.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-diana-border/40 text-diana-brown'
                    }`}>
                      {s.status === 'open' ? 'Session en cours' : 'Clôturée'}
                    </span>
                  </div>
                  <p className="text-diana-brown">Sortie : {s.closedAt ? new Date(s.closedAt).toLocaleString('fr-FR') : '—'}</p>
                  <p className="text-diana-brown">Dépôt d'ouverture : {s.openingAmount.toFixed(2)} DH</p>
                  {s.status === 'closed' && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-diana-cream">
                      <span>Ventes : <span className="font-semibold">{(s.closingSalesTotal ?? 0).toFixed(2)} DH</span> ({s.closingSalesCount ?? 0})</span>
                      <span>Commandes : <span className="font-semibold">{(s.closingCommandesTotal ?? 0).toFixed(2)} DH</span> ({s.closingCommandesCount ?? 0})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
