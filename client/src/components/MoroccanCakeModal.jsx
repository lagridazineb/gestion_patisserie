import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCheck } from 'react-icons/fi'
import {
  MOROCCAN_SABLE_COMPONENTS,
  MOROCCAN_AMANDE_COMPONENTS,
  MOROCCAN_CAKE_COMPOSITIONS,
  MOROCCAN_CAKE_DIVISION_TYPES,
  MOROCCAN_GENERIC_KG_COMPONENTS
} from '../data/products'

export default function MoroccanCakeModal({ open, product, qty, onConfirm, onCancel }) {
  const [targetQty, setTargetQty] = useState(qty || 1)
  
  // States for Cornet Gazelle
  const [divisionType, setDivisionType] = useState('Cornet ET Gazelle')
  const [comp1, setComp1] = useState('')
  const [comp1Qty, setComp1Qty] = useState('')
  const [comp2, setComp2] = useState('')
  const [comp2Qty, setComp2Qty] = useState('')

  // States for Plateaux
  const [selectedSable, setSelectedSable] = useState([])
  const [selectedAmande, setSelectedAmande] = useState([])

  // States for generic "combien de sortes" kg composition (Amande kg, Sable kg)
  const [numSortes, setNumSortes] = useState(1)
  const [sorteRows, setSorteRows] = useState([{ component: '', qty: '' }])

  // Reset states on open/change
  useEffect(() => {
    if (open && product) {
      setTargetQty(qty || 1)
      setDivisionType('Cornet ET Gazelle')
      setComp1('')
      setComp1Qty('')
      setComp2('')
      setComp2Qty('')
      setSelectedSable([])
      setSelectedAmande([])
      setNumSortes(1)
      setSorteRows([{ component: '', qty: '' }])
    }
  }, [open, product, qty])

  if (!product) return null

  const isPlateau = product.id in MOROCCAN_CAKE_COMPOSITIONS
  const isCornetGazelle = product.id === 'g4' // Cornet gazelle/kg
  const genericKgComponents = MOROCCAN_GENERIC_KG_COMPONENTS[product?.id]
  const isGenericKg = !!genericKgComponents
  const isSimpleKg = !isPlateau && !isCornetGazelle && !isGenericKg

  // Composition rules for plateaux
  const plateauRules = isPlateau ? MOROCCAN_CAKE_COMPOSITIONS[product.id] : { amande: 0, sable: 0 }
  const totalRequiredComponents = plateauRules.amande + plateauRules.sable

  // Cornet Gazelle weight verification
  const c1Val = parseFloat(comp1Qty) || 0
  const c2Val = parseFloat(comp2Qty) || 0
  const totalGazelleComposition = c1Val + c2Val
  const diffGazelle = totalGazelleComposition - targetQty
  const isGazelleValid = (() => {
    if (divisionType === 'Seulement Cornet') {
      return comp1 === 'Cornet' && Math.abs(c1Val - targetQty) < 0.001
    }
    if (divisionType === 'Seulement Gazelle') {
      return comp1 === 'Gazelle' && Math.abs(c1Val - targetQty) < 0.001
    }
    // Cornet ET Gazelle
    const hasBothSelected = (comp1 === 'Cornet' && comp2 === 'Gazelle') || (comp1 === 'Gazelle' && comp2 === 'Cornet')
    return hasBothSelected && Math.abs(totalGazelleComposition - targetQty) < 0.001
  })()

  // Handle plateau checkbox toggle
  const handleToggleSable = (item) => {
    setSelectedSable(prev => 
      prev.includes(item.name) ? prev.filter(n => n !== item.name) : [...prev, item.name]
    )
  }

  const handleToggleAmande = (item) => {
    setSelectedAmande(prev => 
      prev.includes(item.name) ? prev.filter(n => n !== item.name) : [...prev, item.name]
    )
  }

  const isPlateauValid = selectedSable.length === plateauRules.sable && selectedAmande.length === plateauRules.amande

  // --- Composition générique (Amande kg / Sable kg) ---
  const handleNumSortesChange = (n) => {
    setNumSortes(n)
    setSorteRows((prev) => {
      const next = [...prev]
      while (next.length < n) next.push({ component: '', qty: '' })
      return next.slice(0, n)
    })
  }
  const updateSorteRow = (index, field, value) => {
    setSorteRows((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }
  const genericTotal = sorteRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0)
  const genericDiff = genericTotal - targetQty
  const isGenericValid = sorteRows.every((row) => row.component && parseFloat(row.qty) > 0) && Math.abs(genericDiff) < 0.001

  const handleConfirm = () => {
    let customNote = ''
    if (isCornetGazelle) {
      if (divisionType === 'Seulement Cornet' || divisionType === 'Seulement Gazelle') {
        customNote = `Division: ${divisionType} | Composition: ${comp1} (${c1Val.toFixed(2)} kg)`
      } else {
        customNote = `Division: ${divisionType} | Composition: ${comp1} (${c1Val.toFixed(2)} kg), ${comp2} (${c2Val.toFixed(2)} kg)`
      }
    } else if (isPlateau) {
      const parts = []
      if (selectedSable.length > 0) parts.push(`Sable: ${selectedSable.join(', ')}`)
      if (selectedAmande.length > 0) parts.push(`Amande: ${selectedAmande.join(', ')}`)
      customNote = `Composants - ${parts.join(' | ')}`
    } else if (isGenericKg) {
      customNote = `Composition (${numSortes} sorte${numSortes > 1 ? 's' : ''}) : ` +
        sorteRows.map((row) => `${row.component} (${(parseFloat(row.qty) || 0).toFixed(2)} kg)`).join(', ')
    }
    
    onConfirm({ customNote }, targetQty)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onCancel}>
          <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="bg-diana-card border border-diana-border rounded-2xl w-full max-w-lg shadow-gold-lg overflow-hidden text-diana-cream"
            onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-diana-border">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] tracking-[2px] uppercase text-diana-brown mb-0.5">
                  {isPlateau ? 'Composition de Plateau' : 'Composition Gâteau Marocain'}
                </p>
                <p className="font-fraunces text-lg font-bold text-diana-cream truncate">
                  {isPlateau ? `Composition pour : ${product.name}` : `Composition pour : ${product.name} (${targetQty} ${product.unit})`}
                </p>
              </div>
              <button onClick={onCancel} className="shrink-0 text-diana-brown hover:text-diana-cream transition-colors p-1">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
              {/* 1. CORNET GAZELLE SPECIFIC LAYOUT */}
              {isCornetGazelle && (
                <div className="space-y-4">
                  <p className="text-xs text-diana-brown text-center leading-relaxed">
                    Veuillez sélectionner le type de division et détailler la composition en Kilogrammes. Le total doit faire {targetQty.toFixed(2)} kg.
                  </p>
                  
                  {/* Division Type */}
                  <div className="bg-diana-dark/10 border border-diana-border/40 p-4 rounded-xl">
                    <label className="block text-xs font-semibold text-center text-diana-brown mb-1.5 uppercase tracking-wide">
                      Type de Division:
                    </label>
                    <select value={divisionType} onChange={(e) => {
                      setDivisionType(e.target.value)
                      setComp1('')
                      setComp2('')
                      setComp1Qty('')
                      setComp2Qty('')
                    }}
                      className="w-full px-3 py-2.5 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 transition-colors text-sm font-semibold">
                      {MOROCCAN_CAKE_DIVISION_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Components selection & Qty */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-diana-brown px-1">
                      <span>Composant Choisi</span>
                      <span>Quantité (Kg)</span>
                    </div>

                    {/* Row 1 */}
                    <div className="grid grid-cols-2 gap-4">
                      <select value={comp1} onChange={(e) => setComp1(e.target.value)}
                        className="w-full px-3 py-2 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm">
                        <option value="">-- Composant 1 --</option>
                        <option value="Cornet">Cornet</option>
                        <option value="Gazelle">Gazelle</option>
                      </select>
                      <input type="number" step="any" min="0" placeholder="0.00" value={comp1Qty}
                        onChange={(e) => setComp1Qty(e.target.value)}
                        className="w-full px-3 py-2 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm" />
                    </div>

                    {/* Row 2 (only shown if not "Seulement ...") */}
                    {divisionType === 'Cornet ET Gazelle' && (
                      <div className="grid grid-cols-2 gap-4">
                        <select value={comp2} onChange={(e) => setComp2(e.target.value)}
                          className="w-full px-3 py-2 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm">
                          <option value="">-- Composant 2 --</option>
                          <option value="Cornet">Cornet</option>
                          <option value="Gazelle">Gazelle</option>
                        </select>
                        <input type="number" step="any" min="0" placeholder="0.00" value={comp2Qty}
                          onChange={(e) => setComp2Qty(e.target.value)}
                          className="w-full px-3 py-2 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm" />
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center pt-2">
                    <p className={`text-sm font-semibold ${isGazelleValid ? 'text-emerald-700' : 'text-diana-danger'}`}>
                      Total Composition: {totalGazelleComposition.toFixed(2)} kg (Cible: {targetQty.toFixed(2)} kg) - Reste à ajuster: {diffGazelle === 0 ? '0.00' : (diffGazelle > 0 ? `+${diffGazelle.toFixed(2)}` : diffGazelle.toFixed(2))} kg
                    </p>
                  </div>
                </div>
              )}

              {/* 2. PLATEAU SPECIFIC LAYOUT */}
              {isPlateau && (
                <div className="space-y-4">
                  <p className="text-xs text-blue-600 font-semibold text-center uppercase tracking-wide">
                    Composition pour : {product.name} (Sélectionnez {totalRequiredComponents} composant(s))
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Sable Column */}
                    <div className="border border-diana-border rounded-xl overflow-hidden bg-diana-dark/10">
                      <div className="bg-diana-dark/20 px-3 py-2 border-b border-diana-border text-center">
                        <span className="text-xs font-bold text-diana-cream">
                          Gâteaux Sable (Sélectionnez {plateauRules.sable})
                        </span>
                      </div>
                      <div className="h-64 overflow-y-auto p-2 space-y-1">
                        {MOROCCAN_SABLE_COMPONENTS.map(item => {
                          const checked = selectedSable.includes(item.name)
                          const disabled = !checked && selectedSable.length >= plateauRules.sable
                          return (
                            <label key={item.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${checked ? 'bg-diana-gold/15' : 'hover:bg-diana-dark/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <input type="checkbox" checked={checked} disabled={disabled}
                                onChange={() => handleToggleSable(item)}
                                className="w-4 h-4 accent-diana-gold shrink-0" />
                              <span className="text-sm font-semibold text-diana-cream flex-1 text-right font-inter select-none">
                                {item.arabic}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Amande Column */}
                    <div className="border border-diana-border rounded-xl overflow-hidden bg-diana-dark/10">
                      <div className="bg-diana-dark/20 px-3 py-2 border-b border-diana-border text-center">
                        <span className="text-xs font-bold text-diana-cream">
                          Gâteaux Amande (Sélectionnez {plateauRules.amande})
                        </span>
                      </div>
                      <div className="h-64 overflow-y-auto p-2 space-y-1">
                        {MOROCCAN_AMANDE_COMPONENTS.map(item => {
                          const checked = selectedAmande.includes(item.name)
                          const disabled = !checked && selectedAmande.length >= plateauRules.amande
                          return (
                            <label key={item.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${checked ? 'bg-diana-gold/15' : 'hover:bg-diana-dark/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <input type="checkbox" checked={checked} disabled={disabled}
                                onChange={() => handleToggleAmande(item)}
                                className="w-4 h-4 accent-diana-gold shrink-0" />
                              <span className="text-sm font-semibold text-diana-cream flex-1 text-right font-inter select-none">
                                {item.arabic}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2.5 GENERIC "COMBIEN DE SORTES" KG LAYOUT (Amande kg / Sable kg) */}
              {isGenericKg && (
                <div className="space-y-4">
                  <p className="text-xs text-diana-brown text-center leading-relaxed">
                    Choisissez le nombre de sortes (1 à 12) et détaillez la composition. Le total doit faire {targetQty.toFixed(2)} kg.
                  </p>

                  <div className="bg-diana-dark/10 border border-diana-border/40 p-4 rounded-xl">
                    <label className="block text-xs font-semibold text-center text-diana-brown mb-1.5 uppercase tracking-wide">
                      Diviser en combien de parties ?
                    </label>
                    <select value={numSortes} onChange={(e) => handleNumSortesChange(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 transition-colors text-sm font-semibold">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} Sorte{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-diana-brown text-center">
                      <span>Composant Choisi</span>
                      <span>Quantité (Kg)</span>
                    </div>
                    {sorteRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4">
                        <select value={row.component} onChange={(e) => updateSorteRow(i, 'component', e.target.value)}
                          className="w-full px-3 py-2 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm">
                          <option value="">-- Composant {i + 1} --</option>
                          {genericKgComponents.map((c) => (
                            <option key={c.id} value={c.arabic}>{c.arabic}</option>
                          ))}
                        </select>
                        <input type="number" step="any" min="0" placeholder="0.00" value={row.qty}
                          onChange={(e) => updateSorteRow(i, 'qty', e.target.value)}
                          className="w-full px-3 py-2 bg-diana-dark border border-diana-border rounded-lg text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm" />
                      </div>
                    ))}
                  </div>

                  <div className="text-center pt-2">
                    <p className={`text-sm font-semibold ${isGenericValid ? 'text-emerald-700' : 'text-diana-danger'}`}>
                      Total Composition: {genericTotal.toFixed(2)} kg (Cible: {targetQty.toFixed(2)} kg) - Reste à ajuster: {Math.abs(genericDiff) < 0.001 ? '0.00' : (genericDiff > 0 ? `+${genericDiff.toFixed(2)}` : genericDiff.toFixed(2))} kg
                    </p>
                  </div>
                </div>
              )}

              {/* 3. SIMPLE KG LAYOUT */}
              {isSimpleKg && (
                <div className="space-y-4 py-2">
                  <p className="text-sm text-diana-brown text-center">
                    Saisie de quantité uniquement (pas de composition particulière requise).
                  </p>
                  <div className="max-w-xs mx-auto">
                    <label className="block text-xs font-bold text-diana-brown mb-1.5">
                      Quantité ({product.unit === 'kg' ? 'Kg' : 'pièces'})
                    </label>
                    <input type="number" min="0.01" step="any" value={targetQty}
                      onChange={(e) => setTargetQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-diana-dark border border-diana-border rounded-xl text-diana-cream focus:outline-none focus:border-diana-gold/50 text-sm font-semibold" required />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-5 pt-3 border-t border-diana-border/20 grid grid-cols-2 gap-4">
              <button onClick={onCancel}
                className="py-3 rounded-xl text-sm font-bold text-white bg-gray-600 hover:bg-gray-700 transition-colors uppercase tracking-wider">
                Annuler
              </button>
              
              {isCornetGazelle && (
                <button onClick={handleConfirm} disabled={!isGazelleValid}
                  className={`py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${isGazelleValid ? 'bg-diana-gold text-white hover:brightness-110' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  Ajouter à la commande
                </button>
              )}

              {isPlateau && (
                <button onClick={handleConfirm} disabled={!isPlateauValid}
                  className={`py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${isPlateauValid ? 'bg-[#0070f3] text-white hover:brightness-110' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  Confirmer sélection
                </button>
              )}

              {isGenericKg && (
                <button onClick={handleConfirm} disabled={!isGenericValid}
                  className={`py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${isGenericValid ? 'bg-diana-gold text-white hover:brightness-110' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  Ajouter à la commande
                </button>
              )}

              {isSimpleKg && (
                <button onClick={handleConfirm} disabled={targetQty <= 0}
                  className={`py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${targetQty > 0 ? 'bg-diana-gold text-white hover:brightness-110' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  Confirmer quantité
                </button>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
