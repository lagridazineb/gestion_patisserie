import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../context/NotificationContext'
import { getAtelierTasks, markAtelierDone, subscribeToStockUpdates } from '../data/stockStore'
import { FiArrowLeft, FiUser, FiPhone, FiCalendar, FiPrinter, FiCheck, FiPackage } from 'react-icons/fi'
import ReceiptHeader from '../components/ReceiptHeader'

// Nombre ou chaîne ("2.5" venant de la base de données) -> affichage sûr, sans jamais planter.
function formatQty(qty) {
  const n = Number(qty)
  if (!Number.isFinite(n)) return qty ?? '0'
  return Number.isInteger(n) ? n : n.toFixed(2)
}

export default function CommandeRzizaPage() {
  const navigate = useNavigate()
  const { addNotification } = useNotification()
  const [tasks, setTasks] = useState([])
  const [receipt, setReceipt] = useState(null)

  const refresh = useCallback(async () => setTasks(await getAtelierTasks('rziza')), [])
  useEffect(() => {
    refresh()
    const unsubscribe = subscribeToStockUpdates(refresh)
    return unsubscribe
  }, [refresh])

  // Dès que le reçu est prêt à l'écran, on lance l'impression automatiquement.
  useEffect(() => {
    if (receipt) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [receipt])

  const rzizaItems = (task) => task.items.filter((i) => i.category === 'rziza')

  // Imprimer = "c'est transmis au fournisseur et prêt" : on marque l'atelier Rziza de cette
  // commande comme terminé (comme un préparateur le ferait) — SANS toucher au stock, puisque
  // ce n'est qu'une commande à transmettre, pas une livraison reçue. Si c'était le dernier
  // atelier en attente, la commande apparaîtra automatiquement dans "Commandes prêtes".
  const handlePrintAndMarkDone = async (task) => {
    setReceipt({ task, items: rzizaItems(task) })
  }

  const confirmDone = async () => {
    if (!receipt) return
    await markAtelierDone(receipt.task.id, 'rziza')
    addNotification('Commande Rziza transmise et marquée prête', 'success')
    setReceipt(null)
    refresh()
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-diana-gold text-sm mb-6 hover:text-diana-goldLight transition-colors print:hidden">
          <FiArrowLeft size={16} /> Retour à la caisse
        </button>

        <div className="mb-6">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Fournisseur</p>
          <h2 className="font-fraunces text-2xl sm:text-3xl font-medium text-diana-cream">Commandes Rziza</h2>
          <p className="text-sm text-diana-brown mt-1">Articles Rziza réservés par des clients (commande normale), à transmettre au fournisseur.</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-diana-card border border-diana-border rounded-2xl p-10 text-center">
            <FiPackage size={32} className="mx-auto mb-3 text-diana-brown opacity-40" />
            <p className="text-sm italic text-diana-brownLight">Aucune commande Rziza en attente pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-diana-card border border-diana-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-diana-cream flex items-center gap-1.5"><FiUser size={13} /> {task.clientName}</p>
                    <p className="text-xs text-diana-brown flex items-center gap-2 mt-0.5">
                      {task.clientPhone && <span className="flex items-center gap-1"><FiPhone size={11} /> {task.clientPhone}</span>}
                      <span className="flex items-center gap-1"><FiCalendar size={11} /> {task.deliveryDate || '—'} {task.deliveryTime || ''}</span>
                    </p>
                  </div>
                  <button onClick={() => handlePrintAndMarkDone(task)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98] shrink-0">
                    <FiPrinter size={13} /> Reçu & marquer prête
                  </button>
                </div>
                <ul className="text-sm text-diana-brownLight space-y-1">
                  {rzizaItems(task).map((i) => (
                    <li key={i.id}>• {i.name} × {formatQty(i.qty)}</li>
                  ))}
                </ul>
                {task.note && <p className="text-xs text-diana-brown italic mt-2">Note : {task.note}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reçu Rziza — NON PAYÉ, sans impact sur le stock */}
      <AnimatePresence>
        {receipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 print:bg-white" onClick={() => setReceipt(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-diana-cream text-diana-dark rounded-2xl p-6 max-w-xs w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="receipt-print bg-white rounded-xl p-4 mb-5 text-xs border border-gray-300 text-black">
                <ReceiptHeader subtitle="Commande fournisseur — Rziza">
                  <p className="text-gray-500 text-[10.5px] mt-1.5">Ticket n°{String(receipt.task.ticketNumber).padStart(3, '0')} · {receipt.task.clientName}</p>
                  <p className="text-gray-500 text-[10.5px]">{new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
                </ReceiptHeader>
                <div className="space-y-1 mb-2">
                  {receipt.items.map((i) => (
                    <div key={i.id} className="flex justify-between py-0.5">
                      <span>{i.name}</span><span>× {formatQty(i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between text-black font-semibold"><span>Statut</span><span>NON PAYÉ</span></div>
                </div>
                <p className="text-gray-500 italic mt-3 text-center">À transmettre au fournisseur — sans impact sur le stock</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 bg-diana-dark text-diana-cream py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiPrinter size={15} /> Imprimer
                </button>
                <button onClick={confirmDone}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/90 text-white py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
                  <FiCheck size={15} /> Prête
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
