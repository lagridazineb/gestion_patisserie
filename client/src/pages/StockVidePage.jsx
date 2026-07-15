import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiTrash2, FiCalendar, FiSearch } from 'react-icons/fi'
import { getStockClearLog, subscribeToStockUpdates, sameDay } from '../data/stockStore'
import KeyboardField from '../components/KeyboardField'

function startOfWeek(d) {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // lundi = 0
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day)
  return date
}

// Page Admin dédiée : historique complet des vidanges de stock, filtrable par jour /
// semaine / mois / date précise, avec recherche produit, le détail produit par produit
// (quantité + valeur) et le montant général de chaque vidange ainsi que sur la période.
export default function StockVidePage() {
  const [log, setLog] = useState([])
  const [period, setPeriod] = useState('jour') // 'jour' | 'semaine' | 'mois' | 'tout'
  const [specificDate, setSpecificDate] = useState('') // remplace le filtre période si renseigné
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => setLog(await getStockClearLog()), [])
  useEffect(() => {
    refresh()
    return subscribeToStockUpdates(refresh)
  }, [refresh])

  const byPeriod = useMemo(() => {
    if (specificDate) return log.filter((entry) => sameDay(entry.timestamp, specificDate))
    if (period === 'tout') return log
    const now = new Date()
    return log.filter((entry) => {
      const d = new Date(entry.timestamp)
      if (period === 'jour') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
      }
      if (period === 'semaine') {
        return d >= startOfWeek(now)
      }
      if (period === 'mois') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }
      return true
    })
  }, [log, period, specificDate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return byPeriod
    return byPeriod
      .map((entry) => ({ ...entry, entries: entry.entries.filter((e) => e.name.toLowerCase().includes(q)) }))
      .filter((entry) => entry.entries.length > 0)
  }, [byPeriod, search])

  // Récapitulatif produit par produit sur toute la période filtrée (tous les produits vidés, cumulés)
  const productSummary = useMemo(() => {
    const map = new Map()
    filtered.forEach((entry) => {
      entry.entries.forEach((e) => {
        const prev = map.get(e.productId) || { name: e.name, qty: 0, value: 0 }
        prev.qty += e.qty
        prev.value += e.value
        map.set(e.productId, prev)
      })
    })
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [filtered])

  const grandTotalQty = productSummary.reduce((s, e) => s + e.qty, 0)
  const grandTotalValue = productSummary.reduce((s, e) => s + e.value, 0)

  const periodLabel = specificDate
    ? new Date(specificDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : { jour: "Aujourd'hui", semaine: 'Cette semaine', mois: 'Ce mois-ci', tout: 'Depuis le début' }[period]

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Admin</p>
            <h2 className="font-fraunces text-2xl sm:text-3xl font-medium text-diana-cream">Stock vidé</h2>
            <p className="text-sm text-diana-brown mt-1">Historique des vidanges (soir et complètes), par jour / semaine / mois</p>
          </div>
          <div className="flex bg-diana-card border border-diana-border rounded-xl p-1 self-start flex-wrap">
            {['jour', 'semaine', 'mois', 'tout'].map((p) => (
              <button key={p} onClick={() => { setPeriod(p); setSpecificDate('') }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${!specificDate && period === p ? 'bg-diana-gold text-diana-darker' : 'text-diana-brown hover:text-diana-cream'}`}>
                {p}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-diana-brown" size={15} />
            <KeyboardField placeholder="Rechercher un produit vidé..." value={search} onChange={setSearch}
              subtitle="Recherche"
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50" />
          </div>
          <div className="flex items-center gap-2">
            <FiCalendar className="text-diana-brown" size={15} />
            <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)}
              className="px-3 py-2 text-sm bg-diana-card border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50" />
            {specificDate && (
              <button onClick={() => setSpecificDate('')} className="text-xs text-diana-brown hover:text-diana-gold underline">Effacer</button>
            )}
          </div>
        </div>

        {/* Total général de la période */}
        <div className="bg-diana-card border border-diana-gold/30 rounded-2xl p-6 mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-diana-brown mb-1 capitalize">{periodLabel}</p>
            <p className="text-[11px] text-diana-brownLight">Quantité totale vidée : {grandTotalQty}</p>
          </div>
          <p className="font-fraunces text-4xl font-semibold text-diana-gold">{grandTotalValue.toFixed(2)} DH</p>
        </div>

        {/* Récapitulatif par produit sur la période */}
        {productSummary.length > 0 && (
          <div className="bg-diana-card border border-diana-border rounded-2xl p-5 mb-8">
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-3">Produits vidés sur la période</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-diana-brown border-b border-diana-border">
                    <th className="text-left py-2 font-medium">Produit</th>
                    <th className="text-right py-2 font-medium">Quantité</th>
                    <th className="text-right py-2 font-medium">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {productSummary.map((p, i) => (
                    <tr key={i} className="border-b border-diana-border/30 last:border-0">
                      <td className="py-2 text-diana-cream">{p.name}</td>
                      <td className="py-2 text-right text-diana-cream">{p.qty}</td>
                      <td className="py-2 text-right text-diana-gold font-medium">{p.value.toFixed(2)} DH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Détail par vidange (date, jour, heure) */}
        <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-3">Détail des vidanges</p>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-diana-brownLight bg-diana-card border border-diana-border rounded-2xl">
            <FiTrash2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm italic">Aucune vidange sur cette période</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((entry) => (
              <div key={entry.id} className="bg-diana-card border border-diana-border rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-diana-cream flex items-center gap-1.5">
                      <FiCalendar size={13} />
                      {entry.type === 'complet' ? 'Vidange complète (toutes catégories)' : 'Vidange du soir (Pain, Viennoiserie, Millefeuille)'}
                    </p>
                    <p className="text-xs text-diana-brown mt-0.5">
                      {new Date(entry.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {' à '}{new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-diana-brown">Quantité</p>
                      <p className="text-sm font-semibold text-diana-cream">{entry.totalQuantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-diana-brown">Valeur</p>
                      <p className="text-sm font-semibold text-diana-gold">{entry.totalValue.toFixed(2)} DH</p>
                    </div>
                  </div>
                </div>
                {entry.entries.length > 0 && (
                  <div className="max-h-56 overflow-y-auto border-t border-diana-border/40 pt-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-diana-brown">
                          <th className="text-left py-1.5 font-medium">Produit</th>
                          <th className="text-right py-1.5 font-medium">Quantité</th>
                          <th className="text-right py-1.5 font-medium">Prix</th>
                          <th className="text-right py-1.5 font-medium">Valeur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.entries.map((e) => (
                          <tr key={e.productId} className="border-t border-diana-border/20">
                            <td className="py-1.5 text-diana-cream">{e.name}</td>
                            <td className="py-1.5 text-right text-diana-cream">{e.qty}</td>
                            <td className="py-1.5 text-right text-diana-brown">{e.price.toFixed(2)} DH</td>
                            <td className="py-1.5 text-right text-diana-gold font-medium">{e.value.toFixed(2)} DH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
