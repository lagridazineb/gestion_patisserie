import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { FiCalendar, FiUser, FiPackage, FiTrendingUp, FiClock, FiChevronDown, FiChevronUp, FiLock, FiCheck, FiSearch, FiInfo, FiAlertTriangle } from 'react-icons/fi'
import { getBilanByUser, getBilanByHour, subscribeToStockUpdates } from '../data/stockStore'
import { getSessionsHistory } from '../data/sessionsStore'
import { findCategory } from '../data/products'
import { getCategoryLabel } from '../i18n/productNames'
import { useLanguage } from '../context/LanguageContext'
import { fetchAllUsers, changeUserPassword } from '../api/auth'
import { useNotification } from '../context/NotificationContext'

function pillClass(active) {
  return `px-4 py-2 rounded-xl text-xs font-medium transition-all ${
    active ? 'bg-diana-gold text-diana-dark' : 'bg-diana-card border border-diana-border text-diana-brown hover:text-diana-cream'
  }`
}

// Une connexion est affichée pour un jour donné si elle y a commencé, s'y est terminée, ou si elle
// est toujours en cours (ouverte ce jour-là ou avant). Avant, seule l'heure d'ouverture comptait :
// un caissier connecté depuis la veille n'apparaissait nulle part dans "Aujourd'hui".
function sessionInDay(s, day) {
  if (!day) return true
  const opened = String(s.openedAt).slice(0, 10)
  const closed = s.closedAt ? String(s.closedAt).slice(0, 10) : null
  return opened === day || closed === day || (s.status === 'open' && opened <= day)
}

export default function UtilisateursPage() {
  const { lang } = useLanguage()
  const { addNotification } = useNotification()
  const [mode, setMode] = useState('today') // 'today' | 'date' | 'all'
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loadError, setLoadError] = useState('')
  const [sessionsError, setSessionsError] = useState(false)
  const inFlight = useRef(false)
  const [accounts, setAccounts] = useState([])

  const refreshAccounts = useCallback(() => { fetchAllUsers().then(setAccounts).catch(() => {}) }, [])
  useEffect(() => { refreshAccounts() }, [refreshAccounts])

  // Même date "effective" que celle envoyée à getBilanByUser, réutilisée pour filtrer
  // la liste des connexions par utilisateur (null = tout l'historique).
  const effectiveDate = mode === 'all' ? null : (mode === 'date' ? date : new Date().toISOString().slice(0, 10))

  const refresh = useCallback(async () => {
    // Une seule requête à la fois : avant, le rafraîchissement automatique (toutes les 8 s) en
    // empilait de nouvelles alors que les précédentes n'étaient pas terminées, ce qui saturait
    // le petit serveur gratuit (et la page mettait plusieurs minutes à s'afficher).
    if (inFlight.current) return
    inFlight.current = true
    try {
      const d = mode === 'all' ? null : (mode === 'date' ? date : new Date().toISOString().slice(0, 10))
      const [bilan, hist] = await Promise.allSettled([getBilanByUser(d), getSessionsHistory()])
      if (bilan.status === 'fulfilled') {
        setData(bilan.value)
        setLoadError('')
      } else {
        const err = bilan.reason
        setLoadError(err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Erreur inconnue')
      }
      if (hist.status === 'fulfilled') { setSessions(hist.value); setSessionsError(false) }
      else setSessionsError(true) // on garde les connexions déjà affichées au lieu de les vider
    } finally {
      inFlight.current = false
    }
  }, [mode, date])

  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh, 60000) // toutes les 60 s (au lieu de 8 s) : page admin, inutile de solliciter le serveur plus souvent
  }, [refresh])

  const categoryLabel = (catId) => {
    if (catId === 'autre') return lang === 'ar' ? 'أخرى' : 'Autre'
    const cat = findCategory(catId)
    return cat ? getCategoryLabel(cat, lang) : catId
  }

  // Avant : `return null` = page totalement blanche, sans explication. Maintenant on affiche
  // "Chargement…" ou, si la requête échoue, le message d'erreur du serveur avec un bouton Réessayer.
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        {loadError ? (
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-diana-danger mb-2">Impossible de charger les utilisateurs</p>
            <p className="text-xs text-diana-brown break-words mb-4">{loadError}</p>
            <button onClick={refresh} className="px-4 py-2 rounded-lg bg-diana-gold text-diana-darker text-xs font-semibold">Réessayer</button>
          </div>
        ) : (
          <p className="text-sm text-diana-brown italic">Chargement…</p>
        )}
      </div>
    )
  }

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

        <CodesAccesSection accounts={accounts} onChanged={refreshAccounts} addNotification={addNotification} />

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

        {sessionsError && (
          <div className="mb-4 p-3 rounded-xl bg-diana-danger/10 border border-diana-danger/30 text-xs text-diana-danger">
            Impossible de charger l'historique des connexions pour le moment (réseau ou serveur lent). Nouvelle tentative automatique…
          </div>
        )}

        <HourFilterSection defaultDate={effectiveDate || new Date().toISOString().slice(0, 10)} accounts={accounts} />

        <div className="space-y-6">
          {data.users.map((u, i) => (
            <UserCard key={u.id} user={u} index={i} categoryLabel={categoryLabel}
              sessions={sessions.filter((s) => s.userId === u.id && sessionInDay(s, effectiveDate))} />
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

// Section admin : changer le code (mot de passe) de n'importe quel compte — préparateurs,
// caissiers, et l'admin lui-même. Chaque ligne a son propre champ + bouton pour éviter de
// mélanger les saisies entre comptes.
function CodesAccesSection({ accounts, onChanged, addNotification }) {
  const [openId, setOpenId] = useState(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const roleLabel = (r) => (r === 'admin' ? 'Administrateur' : r === 'caissier' ? 'Caissier' : 'Préparateur')

  const handleSave = async (userId) => {
    if (!value || value.length < 4) {
      addNotification('Le code doit contenir au moins 4 caractères.', 'error')
      return
    }
    setSaving(true)
    try {
      await changeUserPassword(userId, value)
      addNotification('Code mis à jour avec succès.', 'success')
      setOpenId(null)
      setValue('')
      onChanged()
    } catch (err) {
      addNotification(err?.response?.data?.error || 'Erreur lors de la mise à jour du code.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!accounts || accounts.length === 0) return null

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-diana-card border border-diana-border rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-diana-gold/10 flex items-center justify-center"><FiLock className="text-diana-gold" size={18} /></div>
        <div>
          <h3 className="font-fraunces text-lg text-diana-cream">Codes d'accès</h3>
          <p className="text-xs text-diana-brown">Changer le code de n'importe quel préparateur, caissier, ou le vôtre.</p>
        </div>
      </div>
      <div className="space-y-2">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-diana-dark/30 rounded-xl p-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-diana-cream truncate">{acc.name}</p>
                <p className="text-xs text-diana-brown">{roleLabel(acc.role)}{acc.atelier ? ` · ${acc.atelier}` : ''} · {acc.email}</p>
              </div>
              {openId !== acc.id ? (
                <button onClick={() => { setOpenId(acc.id); setValue('') }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-diana-card border border-diana-border text-diana-brown hover:text-diana-gold hover:border-diana-gold/40 transition-colors">
                  Changer le code
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="password" value={value} onChange={(e) => setValue(e.target.value)}
                    placeholder="Nouveau code" autoFocus
                    className="w-32 px-3 py-1.5 text-sm bg-diana-card border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50" />
                  <button disabled={saving} onClick={() => handleSave(acc.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-diana-gold text-diana-dark flex items-center gap-1 disabled:opacity-50">
                    <FiCheck size={13} /> Valider
                  </button>
                  <button onClick={() => { setOpenId(null); setValue('') }}
                    className="px-2 py-1.5 text-xs text-diana-brown hover:text-diana-cream">Annuler</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Filtre par plage horaire : "combien a été encaissé entre 14h et 16h aujourd'hui", tous
// caissiers confondus ou un seul en particulier — répond directement à la question sans avoir
// besoin de rouvrir/fermer une session.
function HourFilterSection({ defaultDate, accounts }) {
  const [date, setDate] = useState(defaultDate)
  const [startHour, setStartHour] = useState(14)
  const [endHour, setEndHour] = useState(16)
  const [userId, setUserId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setDate(defaultDate) }, [defaultDate])

  const search = async () => {
    setLoading(true)
    try {
      const r = await getBilanByHour(date, startHour, endHour, userId || null)
      setResult(r)
    } finally {
      setLoading(false)
    }
  }

  const cashiers = (accounts || []).filter((a) => a.role === 'caissier' || a.role === 'admin')

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-diana-card border border-diana-border rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-diana-gold/10 flex items-center justify-center"><FiClock className="text-diana-gold" size={18} /></div>
        <div>
          <h3 className="font-fraunces text-lg text-diana-cream">Montant par plage horaire</h3>
          <p className="text-xs text-diana-brown">Ex. : de 14h à 16h, combien a été encaissé — tous caissiers ou un seul.</p>
        </div>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-[11px] text-diana-brown block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
        </div>
        <div>
          <label className="text-[11px] text-diana-brown block mb-1">De</label>
          <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50">
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-diana-brown block mb-1">À</label>
          <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50">
            {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{String(h % 24).padStart(2, '0')}h</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-diana-brown block mb-1">Caissier</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2 text-sm bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50">
            <option value="">Tous</option>
            {cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={search} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-diana-gold text-diana-dark text-sm font-semibold disabled:opacity-50">
          <FiSearch size={14} /> {loading ? 'Recherche…' : 'Voir le montant'}
        </button>
      </div>
      {result && (
        <div className="mt-4 pt-4 border-t border-diana-border/40 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-diana-brown">Ventes : <span className="text-diana-cream font-semibold">{result.totalVentes.toFixed(2)} DH</span> <span className="text-diana-brownLight">({result.nbVentes})</span></span>
          <span className="text-diana-brown">Commandes : <span className="text-diana-cream font-semibold">{result.totalCommandes.toFixed(2)} DH</span> <span className="text-diana-brownLight">({result.nbCommandes})</span></span>
          <span className="text-diana-brown">Total : <span className="text-diana-gold font-semibold">{result.totalGeneral.toFixed(2)} DH</span></span>
        </div>
      )}
    </motion.div>
  )
}

function UserCard({ user, index, categoryLabel, muted = false, roleText = null, sessions = [] }) {
  const [showSessions, setShowSessions] = useState(true)
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

      {/* Toujours affichée pour les vrais utilisateurs (même à 0), sinon on ne sait pas si la section est vide ou cassée */}
      {!muted && (
        <div className="mt-5 pt-4 border-t border-diana-border/50">
          <button onClick={() => setShowSessions((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-diana-brown hover:text-diana-gold transition-colors">
