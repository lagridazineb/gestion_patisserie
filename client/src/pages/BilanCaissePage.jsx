import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiPrinter } from 'react-icons/fi'
import { getCommandesBilan, subscribeToStockUpdates } from '../data/stockStore'

export default function BilanCaissePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [commandesBilan, setCommandesBilan] = useState(null)

  const refresh = useCallback(async () => setCommandesBilan(await getCommandesBilan(date)), [date])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  if (!commandesBilan) return null

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/bilan" className="flex items-center gap-2 text-diana-gold text-sm mb-6 hover:text-diana-goldLight transition-colors w-fit">
          <FiArrowLeft size={16} /> Retour au Bilan & Dépôts
        </Link>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-diana-gold" size={18} />
              <h2 className="font-fraunces text-xl text-diana-cream uppercase tracking-wide">Commande</h2>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50" />
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-diana-dark text-diana-cream border border-diana-border text-xs font-semibold hover:border-diana-gold/40 transition-colors">
                <FiPrinter size={13} /> Imprimer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border-t-4 border-orange-400 bg-diana-dark/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-diana-brown mb-2">1. TOTAL AVANCES (ENTRÉES)</p>
              <div className="flex justify-between text-xs text-diana-brownLight mb-1"><span>Espèces :</span><span>{commandesBilan.avancesEspeces.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-xs text-diana-brownLight mb-2"><span>TPE / Carte :</span><span>{commandesBilan.avancesTpe.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-sm font-semibold text-orange-400 pt-1.5 border-t border-diana-border/40"><span>Total avances :</span><span>{commandesBilan.totalAvances.toFixed(2)} DH</span></div>
            </div>
            <div className="border-t-4 border-emerald-500 bg-diana-dark/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-diana-brown mb-2">2. TOTAL RESTES (RÉCUPÉRÉS)</p>
              <div className="flex justify-between text-xs text-diana-brownLight mb-1"><span>Espèces :</span><span>{commandesBilan.restesEspeces.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-xs text-diana-brownLight mb-2"><span>TPE / Carte :</span><span>{commandesBilan.restesTpe.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-sm font-semibold text-emerald-500 pt-1.5 border-t border-diana-border/40"><span>Total restes :</span><span>{commandesBilan.totalRestes.toFixed(2)} DH</span></div>
            </div>
            {/* Palette caramel/beige claire pour une bonne lisibilité des chiffres */}
            <div className="bg-gradient-to-br from-[#E8C99A] to-[#D9A86C] rounded-xl p-4 border border-[#C89A5C]/40">
              <p className="text-xs font-semibold text-[#5C4326] mb-2">3. CAISSE GLOBALE JOUR</p>
              <div className="flex justify-between text-xs text-[#5C4326] mb-1"><span>Total espèces :</span><span>{commandesBilan.totalEspeces.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-xs text-[#5C4326] mb-2"><span>Total TPE :</span><span>{commandesBilan.totalTpe.toFixed(2)} DH</span></div>
              <div className="flex justify-between text-sm font-bold text-[#3A2A18] pt-1.5 border-t border-[#5C4326]/25"><span>Chiffre d'affaire jour :</span><span>{commandesBilan.chiffreAffaireJour.toFixed(2)} DH</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-diana-brown mb-2 flex items-center gap-1.5">
                <span className="bg-orange-400/20 text-orange-400 px-2 py-0.5 rounded text-[10px]">NOUVEAU</span> Commandes (Avances reçues)
              </p>
              {commandesBilan.nouvellesCommandes.length === 0 ? (
                <p className="text-xs italic text-diana-brownLight py-3">Aucune nouvelle commande</p>
              ) : (
                <div className="space-y-1.5">
                  {commandesBilan.nouvellesCommandes.map((r) => (
                    <div key={r.id} className="flex justify-between text-xs bg-diana-dark/20 rounded-lg px-3 py-2">
                      <span className="text-diana-brownLight">#{r.ticketNumber} · {r.clientName} · {r.paymentMode === 'cash' ? 'Espèces' : 'TPE'}</span>
                      <span className="font-semibold text-orange-400">+{r.avance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-diana-brown mb-2 flex items-center gap-1.5">
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px]">RÉCUPÉRÉ</span> Commandes livrées (Solde)
              </p>
              {commandesBilan.commandesLivrees.length === 0 ? (
                <p className="text-xs italic text-diana-brownLight py-3">Aucune commande livrée</p>
              ) : (
                <div className="space-y-1.5">
                  {commandesBilan.commandesLivrees.map((r) => (
                    <div key={r.id} className="flex justify-between text-xs bg-diana-dark/20 rounded-lg px-3 py-2">
                      <span className="text-diana-brownLight">#{r.ticketNumber} · {r.clientName} · {r.soldePaymentMode === 'cash' ? 'Espèces' : 'TPE'}</span>
                      <span className="font-semibold text-emerald-400">+{(r.soldeAmount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {commandesBilan.fondsCaisse.length > 0 && (
            <div className="mt-6 pt-5 border-t border-diana-border/40">
              <p className="text-xs font-semibold text-diana-brown mb-2">Fonds de caisse déposés ce jour</p>
              <div className="space-y-1.5">
                {commandesBilan.fondsCaisse.map((f) => (
                  <p key={f.id} className="text-xs text-diana-brownLight">
                    💰 {f.amount.toFixed(2)} DH à {new Date(f.timestamp).toLocaleTimeString('fr-FR')}{f.note && ` — ${f.note}`}
                  </p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
