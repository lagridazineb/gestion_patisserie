import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiDollarSign, FiCalendar, FiTrendingUp, FiPrinter } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const dailySales = [
  { hour: '08h', amount: 450 }, { hour: '09h', amount: 820 }, { hour: '10h', amount: 1200 },
  { hour: '11h', amount: 980 }, { hour: '12h', amount: 1500 }, { hour: '13h', amount: 2100 },
  { hour: '14h', amount: 1800 }, { hour: '15h', amount: 950 }, { hour: '16h', amount: 1200 },
  { hour: '17h', amount: 1600 }, { hour: '18h', amount: 800 }, { hour: '19h', amount: 400 },
]

const transactions = [
  { id: 'V001', time: '14:32', items: 3, total: 25.50, method: 'Espèces' },
  { id: 'V002', time: '14:15', items: 1, total: 157.00, method: 'TPE' },
  { id: 'V003', time: '13:48', items: 5, total: 48.00, method: 'Espèces' },
  { id: 'V004', time: '13:20', items: 2, total: 192.00, method: 'TPE' },
  { id: 'V005', time: '12:55', items: 4, total: 80.00, method: 'Espèces' },
  { id: 'V006', time: '12:30', items: 2, total: 50.00, method: 'TPE' },
  { id: 'V007', time: '11:45', items: 6, total: 35.00, method: 'Espèces' },
  { id: 'V008', time: '11:10', items: 1, total: 220.00, method: 'TPE' },
]

export default function VentesPage() {
  const [period, setPeriod] = useState('today')
  const totalVentes = transactions.reduce((s, t) => s + t.total, 0)
  const totalTransactions = transactions.length
  const moyenneTicket = totalVentes / totalTransactions

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Rapport</p>
            <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Ventes</h2>
          </div>
          <div className="flex gap-2">
            {['today', 'week', 'month'].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                  period === p ? 'bg-diana-gold text-diana-dark' : 'bg-diana-card border border-diana-border text-diana-brown hover:text-diana-cream'
                }`}>
                {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            { label: "Chiffre d'affaires", value: `${totalVentes.toFixed(2)} DH`, icon: FiDollarSign, color: 'bg-diana-gold/10 text-diana-gold' },
            { label: 'Transactions', value: totalTransactions, icon: FiTrendingUp, color: 'bg-blue-500/10 text-blue-400' },
            { label: 'Ticket moyen', value: `${moyenneTicket.toFixed(2)} DH`, icon: FiCalendar, color: 'bg-green-500/10 text-green-400' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}><stat.icon size={18} /></div>
              <p className="font-fraunces text-2xl font-semibold text-diana-cream mb-1">{stat.value}</p>
              <p className="text-xs text-diana-brown">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-diana-card border border-diana-border rounded-2xl p-6 mb-8">
          <h3 className="font-fraunces text-lg text-diana-cream mb-5">Ventes par heure</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A2F26" />
              <XAxis dataKey="hour" stroke="#8A7A66" fontSize={11} />
              <YAxis stroke="#8A7A66" fontSize={11} />
              <Tooltip contentStyle={{ background: '#241B15', border: '1px solid #3A2F26', borderRadius: '12px', color: '#F7F1E5', fontSize: '12px' }} />
              <Bar dataKey="amount" fill="#C9A15F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-diana-card border border-diana-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-diana-border flex items-center justify-between">
            <h3 className="font-fraunces text-lg text-diana-cream">Transactions récentes</h3>
            <button className="flex items-center gap-2 text-xs text-diana-brown hover:text-diana-gold transition-colors">
              <FiPrinter size={14} /> Imprimer
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-diana-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-diana-brown uppercase tracking-wider">N°</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-diana-brown uppercase tracking-wider">Heure</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-diana-brown uppercase tracking-wider">Articles</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-diana-brown uppercase tracking-wider">Total</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-diana-brown uppercase tracking-wider">Méthode</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-diana-border/30 last:border-0 hover:bg-diana-dark/30 transition-colors">
                    <td className="px-6 py-3 text-sm text-diana-cream">{t.id}</td>
                    <td className="px-6 py-3 text-sm text-diana-brown">{t.time}</td>
                    <td className="px-6 py-3 text-sm text-diana-cream text-center">{t.items}</td>
                    <td className="px-6 py-3 text-sm text-diana-gold font-medium text-right">{t.total.toFixed(2)} DH</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${t.method === 'TPE' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>{t.method}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}