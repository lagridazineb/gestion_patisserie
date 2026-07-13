import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiImage, FiTrash2 } from 'react-icons/fi'

export default function CakeCustomizationModal({ open, product, qty = 1, onConfirm, onSkip }) {
  const [note, setNote] = useState('')
  const [imageData, setImageData] = useState(null)
  const PERSON_PHOTO_SURCHARGE = 40

  useEffect(() => {
    if (open) { setNote(''); setImageData(null) }
  }, [open, product])

  if (!product) return null

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Redimensionne à 900px de large maximum et compresse en JPEG : une photo de téléphone
        // (souvent 3 à 10 Mo) passe ainsi à quelques centaines de Ko, pour que l'enregistrement
        // de la commande ne soit jamais bloqué par une image trop lourde.
        const maxWidth = 900
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setImageData(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = () => setImageData(reader.result)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => setImageData(null)

  // La photo de référence ajoute automatiquement le supplément (portrait à reproduire),
  // sans case à cocher : dès qu'une photo est jointe, le supplément s'applique.
  const surcharge = imageData ? PERSON_PHOTO_SURCHARGE : 0
  const qtyValue = qty > 0 ? qty : 1
  // Total réel = (prix unitaire x quantité/kg) + supplément fixe (non multiplié par le poids).
  const baseTotal = (product.price || 0) * qtyValue
  const finalTotal = baseTotal + surcharge

  // IMPORTANT : on garde le prix unitaire d'origine (product.price) tel quel, au lieu de le
  // "diluer" avec le supplément (finalTotal / qty). Le prix unitaire dilué faisait que le tarif
  // ne bougeait plus correctement quand on changeait le kg ensuite : le supplément se retrouvait
  // multiplié par le nouveau poids à chaque modification. Le supplément est donc conservé à part
  // (personPhotoSurcharge) et additionné une seule fois au total, quel que soit le kg choisi.
  const confirm = () => onConfirm({
    customNote: note.trim(),
    customImage: imageData,
    personPhotoSurcharge: surcharge,
    price: product.price || 0,
  })
  const skip = () => onSkip()

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={skip}>
          <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="bg-diana-card border border-diana-gold/30 rounded-2xl w-full max-w-sm shadow-gold-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-diana-border">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] tracking-[2px] uppercase text-diana-brown mb-1">Personnalisation (facultatif)</p>
                <p className="font-fraunces text-base text-diana-cream truncate">{product.name}</p>
              </div>
              <button onClick={skip} className="shrink-0 text-diana-brown hover:text-diana-cream transition-colors p-1">
                <FiX size={18} />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 space-y-3">
              <div>
                <label className="text-xs text-diana-brown mb-1 block">Texte à écrire sur le gâteau</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  placeholder='Ex: "Joyeux Anniversaire Sara"'
                  className="w-full px-3 py-2.5 text-sm bg-diana-dark/30 border border-diana-border rounded-lg text-diana-cream placeholder-diana-brown focus:outline-none focus:border-diana-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-xs text-diana-brown mb-1 block">Photo de référence (déco, modèle...)</label>
                {imageData ? (
                  <div className="relative">
                    <img src={imageData} alt="Référence" className="w-full h-32 object-cover rounded-lg border border-diana-border" />
                    <button onClick={removeImage}
                      className="absolute top-2 right-2 bg-diana-danger text-white p-1.5 rounded-lg hover:brightness-110">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 h-24 border border-dashed border-diana-border rounded-lg cursor-pointer text-diana-brown hover:border-diana-gold/40 hover:text-diana-gold transition-colors">
                    <FiImage size={20} />
                    <span className="text-xs">Ajouter une photo</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
                  </label>
                )}
              </div>
              {imageData && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-diana-accent/10 border border-diana-accent/20">
                  <span className="text-xs text-diana-accentLight">
                    Photo de référence jointe : supplément portrait ajouté automatiquement <span className="font-semibold">+{PERSON_PHOTO_SURCHARGE} DH</span>
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-diana-border/40 text-xs text-diana-brown">
                <span>Quantité</span>
                <span className="text-diana-cream font-medium">{Number.isInteger(qtyValue) ? qtyValue : qtyValue.toFixed(2)} {product.unit === 'kg' ? 'kg' : 'pièce(s)'}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs text-diana-brown">Total</span>
                <span className="font-fraunces text-lg text-diana-gold">
                  {finalTotal.toFixed(2)} DH {surcharge > 0 && <span className="text-xs text-diana-brownLight font-inter">({baseTotal.toFixed(2)} + {surcharge})</span>}
                </span>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5">
              <button onClick={skip}
                className="py-3 rounded-xl text-sm font-semibold text-diana-brownDark bg-diana-creamDark/20 border border-diana-border hover:bg-diana-creamDark/30 transition-colors">
                Passer
              </button>
              <button onClick={confirm}
                className="py-3 rounded-xl text-sm font-semibold bg-diana-gold text-diana-dark hover:brightness-110 transition-all active:scale-[0.98]">
                Ajouter
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
