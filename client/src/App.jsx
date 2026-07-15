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

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

// La page de connexion est désormais la porte d'entrée du site : "/" affiche le login
// tant que personne n'est connecté. Une fois connecté, admin et caissier arrivent
// directement sur la Caisse ; un préparateur est redirigé vers sa page de production.
function IndexRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-diana-dark flex items-center justify-center text-diana-gold">Chargement...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
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
        <Route path="preparateur" element={<ProtectedRoute allowedRoles={['preparateur']}><PreparateurPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
