// Redimensionne et recadre une image (fichier uploadé) côté navigateur avant envoi au serveur,
// pour que les photos de produits restent petites et bien cadrées quelle que soit leur taille
// d'origine. Retourne une chaîne base64 (data:image/jpeg;base64,...).
export function resizeImageFile(file, { width = 500, height = 400, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Impossible de lire l'image"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Fichier image invalide"))
      img.onload = () => {
        const targetRatio = width / height
        const ratio = img.width / img.height
        let sx = 0, sy = 0, sw = img.width, sh = img.height
        if (ratio > targetRatio) {
          sw = img.height * targetRatio
          sx = (img.width - sw) / 2
        } else {
          sh = img.width / targetRatio
          sy = (img.height - sh) * 0.28 // léger biais vers le haut pour ne pas couper le sommet du verre
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
