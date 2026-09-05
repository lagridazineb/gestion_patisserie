import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import POSPage from './pages/POSPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StockPage from './pages/StockPage'
import StockVidePage from './pages/StockVidePage'
import ProduitsPage from './pages/ProduitsPage'
import PreparateurPage from './pages/PreparateurPage'
import CommandesPage from './pages/CommandesPage'
import HistoriquePage from './pages/HistoriquePage'
import VentesPage from './pages/VentesPage'
import RemboursementPage from './pages/RemboursementPage'
import AchatsPage from './pages/AchatsPage'
import BilanPage from './pages/BilanPage'
import BilanCaissePage from './pages/BilanCaissePage'
import SuiviCommandesPage from './pages/SuiviCommandesPage'
import CommandeRzizaPage from './pages/CommandeRzizaPage'
import UtilisateursPage from './pages/UtilisateursPage'
import CafePOSPage from './pages/CafePOSPage'
import CafeProduitsPage from './pages/CafeProduitsPage'
import CafeBilanPage from './pages/CafeBilanPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

// Réservé aux comptes café — un compte pâtisserie qui tomberait sur une URL /cafe/... est
// renvoyé vers son propre espace plutôt que de voir une page qui ne le concerne pas.
function CafeProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-cafe-bg flex items-center justify-center text-cafe-terracotta">Chargement...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if ((user?.business || 'patisserie') !== 'cafe') return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/cafe" replace />
  return children
}

// La page de connexion est désormais la porte d'entrée du site : "/" affiche le login
// tant que personne n'est connecté. Une fois connecté : un compte café arrive sur la Caisse
// café ; côté pâtisserie, admin et caissier arrivent directement sur la Caisse, un
// préparateur est redirigé vers sa page de production.
function IndexRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if ((user?.business || 'patisserie') === 'cafe') return <Navigate to="/cafe" replace />
  if (user?.role === 'preparateur') return <Navigate to="/preparateur" replace />
  return <POSPage />
}

function CommandeRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (user?.role === 'preparateur') return <Navigate to="/preparateur" replace />
  return <CommandesPage />
}

function SuiviRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (user?.role === 'preparateur') return <Navigate to="/preparateur" replace />
  return <SuiviCommandesPage />
}

function CommandeRzizaRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (user?.role === 'preparateur') return <Navigate to="/preparateur" replace />
  return <CommandeRzizaPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<IndexRoute />} />
        <Route path="dashboard" element={<Navigate to="/bilan" replace />} />
        <Route path="stock" element={<ProtectedRoute allowedRoles={['admin']}><StockPage /></ProtectedRoute>} />
        <Route path="stock-vide" element={<ProtectedRoute allowedRoles={['admin']}><StockVidePage /></ProtectedRoute>} />
        <Route path="produits" element={<ProtectedRoute allowedRoles={['admin']}><ProduitsPage /></ProtectedRoute>} />
        <Route path="commandes" element={<CommandeRoute />} />
        <Route path="commandes/suivi" element={<SuiviRoute />} />
        <Route path="commande-rziza" element={<CommandeRzizaRoute />} />
        <Route path="historique" element={<ProtectedRoute allowedRoles={['admin']}><HistoriquePage /></ProtectedRoute>} />
        <Route path="ventes" element={<ProtectedRoute allowedRoles={['admin']}><VentesPage /></ProtectedRoute>} />
        <Route path="remboursement" element={<ProtectedRoute allowedRoles={['admin']}><RemboursementPage /></ProtectedRoute>} />
        <Route path="achats" element={<ProtectedRoute allowedRoles={['admin']}><AchatsPage /></ProtectedRoute>} />
        <Route path="bilan" element={<ProtectedRoute allowedRoles={['admin']}><BilanPage /></ProtectedRoute>} />
        <Route path="bilan-caisse" element={<ProtectedRoute allowedRoles={['admin']}><BilanCaissePage /></ProtectedRoute>} />
        <Route path="utilisateurs" element={<ProtectedRoute allowedRoles={['admin']}><UtilisateursPage /></ProtectedRoute>} />
        <Route path="preparateur" element={<ProtectedRoute allowedRoles={['preparateur']}><PreparateurPage /></ProtectedRoute>} />

        {/* Espace Café — mêmes comptes (colonne business), pages dédiées */}
        <Route path="cafe" element={<CafeProtectedRoute><CafePOSPage /></CafeProtectedRoute>} />
        <Route path="cafe/produits" element={<CafeProtectedRoute allowedRoles={['admin']}><CafeProduitsPage /></CafeProtectedRoute>} />
        <Route path="cafe/bilan" element={<CafeProtectedRoute allowedRoles={['admin']}><CafeBilanPage /></CafeProtectedRoute>} />
      </Route>
    </Routes>
  )
}
