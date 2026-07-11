import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiTrendingUp, FiPackage, FiAlertTriangle, FiDollarSign, FiUsers } from 'react-icons/fi'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const salesData = [
  { name: 'Lun', ventes: 2400 }, { name: 'Mar', ventes: 3200 }, { name: 'Mer', ventes: 2800 },
  { name: 'Jeu', ventes: 4100 }, { name: 'Ven', ventes: 5200 }, { name: 'Sam', ventes: 6800 }, { name: 'Dim', ventes: 4500 },
]
const monthlyData = [
  { name: 'Jan', ventes: 42000 }, { name: 'Fév', ventes: 38000 }, { name: 'Mar', ventes: 45000 },
  { name: 'Avr', ventes: 52000 }, { name: 'Mai', ventes: 48000 }, { name: 'Juin', ventes: 55000 },
]
const topProducts = [
  { name: 'Pain semoule', ventes: 450, color: '#C9A15F' }, { name: 'Croissant', ventes: 320, color: '#D4B87A' },
  { name: 'Millefeuille', ventes: 180, color: '#E08A6F' }, { name: 'Chebakia', ventes: 150, color: '#A8833D' },
  { name: 'Cake 30', ventes: 120, color: '#8B3A2A' },
]
const lowStock = [
  { name: 'Pain au lait', stock: 3, min: 10 }, { name: 'Croissant special', stock: 5, min: 15 },
  { name: 'Millefeuille Pistache', stock: 2, min: 8 }, { name: 'Cheesecake', stock: 1, min: 5 },
  { name: 'Nem poulet', stock: 4, min: 12 },
]
const stats = [
  { label: "Chiffre d'affaires du jour", value: '5,240 DH', icon: FiDollarSign, change: '+12%', color: 'bg-green-500/10 text-green-400' },
  { label: "Ventes du jour", value: '142', icon: FiTrendingUp, change: '+8%', color: 'bg-diana-gold/10 text-diana-gold' },
  { label: 'Produits en stock', value: '1,247', icon: FiPackage, change: '-3%', color: 'bg-blue-500/10 text-blue-400' },
  { label: 'Clients servis', value: '89', icon: FiUsers, change: '+15%', color: 'bg-purple-500/10 text-purple-400' },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState('week')
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs tracking-[2px] uppercase text-diana-brown mb-1">Tableau de bord</p>
          <h2 className="font-fraunces text-3xl font-medium text-diana-cream">Vue d'ensemble</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-diana-card border border-diana-border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}><stat.icon size={20} /></div>
                <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{stat.change}</span>
              </div>
              <p className="font-fraunces text-2xl font-semibold text-diana-cream mb-1">{stat.value}</p>
              <p className="text-xs text-diana-brown">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-diana-card border border-diana-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-fraunces text-lg text-diana-cream">Ventes</h3>
              <div className="flex gap-2">
                {['day', 'week', 'month'].map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-diana-gold text-diana-dark' : 'bg-diana-dark text-diana-brown hover:text-diana-cream'}`}>
                    {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={period === 'month' ? monthlyData : salesData}>
                <defs><linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A15F" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9A15F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A2F26" />
                <XAxis dataKey="name" stroke="#8A7A66" fontSize={12} />
                <YAxis stroke="#8A7A66" fontSize={12} />
                <Tooltip contentStyle={{ background: '#241B15', border: '1px solid #3A2F26', borderRadius: '12px', color: '#F7F1E5', fontSize: '12px' }} />
                <Area type="monotone" dataKey="ventes" stroke="#C9A15F" fillOpacity={1} fill="url(#colorVentes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-6">
            <h3 className="font-fraunces text-lg text-diana-cream mb-5">Produits les plus vendus</h3>
            <div className="space-y-4">
              {topProducts.map((prod, i) => (
                <div key={prod.name} className="flex items-center gap-3">
                  <span className="text-xs text-diana-brown w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-diana-cream">{prod.name}</span>
                      <span className="text-xs text-diana-gold">{prod.ventes}</span>
                    </div>
                    <div className="h-1.5 bg-diana-dark rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(prod.ventes / 450) * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: prod.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <FiAlertTriangle className="text-diana-danger" size={18} />
              <h3 className="font-fraunces text-lg text-diana-cream">Stock faible</h3>
            </div>
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b border-diana-border/50 last:border-0">
                  <span className="text-sm text-diana-cream">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-diana-dark rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min((item.stock / item.min) * 100, 100)}%`, backgroundColor: item.stock <= 2 ? '#B5564B' : '#C9A15F' }} />
                    </div>
                    <span className={`text-xs font-medium ${item.stock <= 2 ? 'text-diana-danger' : 'text-diana-gold'}`}>{item.stock} / {item.min}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-diana-card border border-diana-border rounded-2xl p-6">
            <h3 className="font-fraunces text-lg text-diana-cream mb-5">Répartition des ventes</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={topProducts} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="ventes">
                  {topProducts.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#241B15', border: '1px solid #3A2F26', borderRadius: '12px', color: '#F7F1E5', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {topProducts.map((prod) => (
                <div key={prod.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prod.color }} />
                  <span className="text-xs text-diana-brown">{prod.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}