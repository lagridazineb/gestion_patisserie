import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUsers, FiPlus, FiTrash2, FiLock, FiEdit3, FiBox, FiSave, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { apiRequest } from '../api/client'
import { ATELIERS } from '../data/products'
import { getStock } from '../data/stockStore'

export default function UtilisateursPage() {
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [stockData, setStockData] = useState({})
  const [selectedAtelier, setSelectedAtelier] = useState(null)
  const [stockEdit, setStockEdit] = useState({})

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'preparateur', atelier: 'pain'
  })
  const [codeData, setCodeData] = useState({
    newPassword: '', currentPassword: ''
  })

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await apiRequest('/api/users')
      setUsers(res.users || [])
    } catch (e) {
      addNotification('Erreur chargement utilisateurs', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      addNotification('Utilisateur créé', 'success')
      setShowAddModal(false)
      setFormData({ name: '', email: '', password: '', role: 'preparateur', atelier: 'pain' })
      fetchUsers()
    } catch (e) {
      addNotification(e.message || 'Erreur création', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return
    try {
      await apiRequest(`/api/users/${id}`, { method: 'DELETE' })
      addNotification('Utilisateur supprimé', 'success')
      fetchUsers()
    } catch (e) {
      addNotification('Erreur suppression', 'error')
    }
  }

  // ✅ ADMIN : Changer le code d'un utilisateur
  const handleChangeCode = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      await apiRequest(`/api/auth/change-code/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: codeData.newPassword }),
      })
      addNotification(`Code de ${selectedUser.name} mis à jour`, 'success')
      setShowCodeModal(false)
      setCodeData({ newPassword: '', currentPassword: '' })
      setSelectedUser(null)
    } catch (e) {
      addNotification(e.message || 'Erreur modification code', 'error')
    }
  }

  // ✅ ADMIN : Changer son propre code
  const handleChangeMyCode = async (e) => {
    e.preventDefault()
    try {
      await apiRequest('/api/auth/change-my-code', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: codeData.newPassword,
          currentPassword: codeData.currentPassword,
        }),
      })
      addNotification('Votre code a été mis à jour', 'success')
      setShowCodeModal(false)
      setCodeData({ newPassword: '', currentPassword: '' })
    } catch (e) {
      addNotification(e.message || 'Code actuel incorrect', 'error')
    }
  }

  // ✅ ADMIN : Ouvrir le modal de stock
  const openStockModal = async (atelier) => {
    setSelectedAtelier(atelier)
    try {
      const stock = await getStock()
      setStockData(stock)
      setStockEdit({})
      setShowStockModal(true)
    } catch (e) {
      addNotification('Erreur chargement stock', 'error')
    }
  }

  // ✅ ADMIN : Modifier le stock
  const handleStockUpdate = async () => {
    try {
      await apiRequest(`/api/stock/daily/${selectedAtelier}`, {
        method: 'PUT',
        body: JSON.stringify({ stockData: stockEdit }),
      })
      addNotification('Stock du jour mis à jour', 'success')
      setShowStockModal(false)
      setStockEdit({})
    } catch (e) {
      addNotification('Erreur mise à jour stock', 'error')
    }
  }

  const updateStockValue = (productId, value) => {
    setStockEdit((prev) => ({ ...prev, [productId]: Number(value) || 0 }))
  }

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className="text-diana-brown">Accès réservé aux administrateurs</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Gestion</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Utilisateurs</h2>
            <p className="text-sm text-diana-brown mt-1">Gérer les préparateurs, caissiers et codes</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-diana-gold text-diana-dark rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
              <FiLock size={16} /> Mon code
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-diana-gold text-diana-dark rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
              <FiPlus size={16} /> Ajouter
            </button>
          </div>
        </motion.div>

        {/* Liste des utilisateurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {users.map((u) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-diana-gold/15 flex items-center justify-center text-diana-gold font-bold">
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-fraunces text-base text-diana-cream">{u.name}</h3>
                  <p className="text-xs text-diana-brown">{u.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  u.role === 'admin' ? 'bg-diana-accent/15 text-diana-accentLight' :
                  u.role === 'caissier' ? 'bg-emerald-500/15 text-emerald-400' :
                  'bg-blue-500/15 text-blue-400'
                }`}>
                  {u.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-diana-brown mb-4">
                <FiBox size={12} />
                {u.atelier ? ATELIERS.find(a => a.id === u.atelier)?.label || u.atelier : '—'}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedUser(u); setShowCodeModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-diana-gold/15 text-diana-gold border border-diana-gold/30 text-xs font-semibold hover:bg-diana-gold/25 transition-colors">
                  <FiLock size={12} /> Code
                </button>
                <button onClick={() => handleDelete(u.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-diana-danger/15 text-diana-danger border border-diana-danger/30 text-xs font-semibold hover:bg-diana-danger/25 transition-colors">
                  <FiTrash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ✅ Section Stock du jour par atelier */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h3 className="font-fraunces text-lg text-diana-cream mb-4 flex items-center gap-2">
            <FiBox className="text-diana-gold" /> Stock du jour par atelier
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ATELIERS.map((atelier) => (
              <button key={atelier.id} onClick={() => openStockModal(atelier.id)}
                className="bg-diana-card border border-diana-border rounded-xl p-4 text-left hover:border-diana-gold/40 transition-colors">
                <p className="text-sm font-medium text-diana-cream">{atelier.label}</p>
                <p className="text-xs text-diana-brown mt-1">Modifier le stock</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Modal Ajouter */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-fraunces text-xl text-diana-cream mb-4">Nouvel utilisateur</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-xs text-diana-brown mb-1.5 block">Nom</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm" required />
                </div>
                <div>
                  <label className="text-xs text-diana-brown mb-1.5 block">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm" required />
                </div>
                <div>
                  <label className="text-xs text-diana-brown mb-1.5 block">Mot de passe</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-diana-brown mb-1.5 block">Rôle</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm">
                      <option value="preparateur">Préparateur</option>
                      <option value="caissier">Caissier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-diana-brown mb-1.5 block">Atelier</label>
                    <select value={formData.atelier} onChange={(e) => setFormData({...formData, atelier: e.target.value})}
                      className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm">
                      {ATELIERS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-diana-dark text-diana-cream text-sm font-medium">Annuler</button>
                  <button type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-diana-gold text-diana-dark text-sm font-semibold">Créer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Changer Code */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-fraunces text-xl text-diana-cream mb-4">
                {selectedUser ? `Changer le code de ${selectedUser.name}` : 'Changer mon code'}
              </h3>
              <form onSubmit={selectedUser ? handleChangeCode : handleChangeMyCode} className="space-y-4">
                {!selectedUser && (
                  <div>
                    <label className="text-xs text-diana-brown mb-1.5 block">Code actuel</label>
                    <input type="password" value={codeData.currentPassword}
                      onChange={(e) => setCodeData({...codeData, currentPassword: e.target.value})}
                      className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm" required />
                  </div>
                )}
                <div>
                  <label className="text-xs text-diana-brown mb-1.5 block">
                    {selectedUser ? 'Nouveau code' : 'Nouveau code'}
                  </label>
                  <input type="password" value={codeData.newPassword}
                    onChange={(e) => setCodeData({...codeData, newPassword: e.target.value})}
                    className="w-full px-3 py-2.5 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm" required minLength={4} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCodeModal(false); setSelectedUser(null); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-diana-dark text-diana-cream text-sm font-medium">Annuler</button>
                  <button type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-diana-gold text-diana-dark text-sm font-semibold">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Modal Stock du jour */}
      <AnimatePresence>
        {showStockModal && selectedAtelier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-fraunces text-xl text-diana-cream">
                  Stock du jour — {ATELIERS.find(a => a.id === selectedAtelier)?.label}
                </h3>
                <button onClick={() => setShowStockModal(false)} className="text-diana-brown hover:text-diana-cream">
                  <FiX size={20} />
                </button>
              </div>
              <div className="space-y-3 mb-6">
                {Object.entries(stockData).map(([productId, quantity]) => (
                  <div key={productId} className="flex items-center gap-3">
                    <span className="text-sm text-diana-cream flex-1">{productId}</span>
                    <input
                      type="number"
                      defaultValue={quantity}
                      onChange={(e) => updateStockValue(productId, e.target.value)}
                      className="w-24 px-3 py-2 bg-diana-dark/30 border border-diana-border rounded-xl text-diana-cream text-sm text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowStockModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-diana-dark text-diana-cream text-sm font-medium">Annuler</button>
                <button onClick={handleStockUpdate}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-diana-gold text-diana-dark text-sm font-semibold flex items-center justify-center gap-2">
                  <FiSave size={14} /> Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
