// Traduction AUTOMATIQUE (approximative) des noms de produits français -> arabe, utilisée
// uniquement en l'absence d'une traduction saisie par l'admin (product.nameAr / edit.nameAr).
// Principe : on traduit mot par mot les termes courants (pâtisserie/boulangerie) reconnus avec
// certitude, et on laisse tel quel tout mot non reconnu (nom propre, terme régional très
// spécifique) plutôt que de risquer une mauvaise traduction. L'admin peut toujours corriger/
// affiner un nom précis depuis la page "Produits".
const WORD_DICTIONARY = {
  // Familles de produits
  'pain': 'خبز', 'pains': 'خبز', 'baguette': 'باغيت', 'bagette': 'باغيت',
  'viennoiserie': 'معجنات', 'patisserie': 'حلويات', 'pâtisserie': 'حلويات',
  'croissant': 'كرواسون', 'brioche': 'بريوش', 'cake': 'كيك', 'cakes': 'كيك',
  'millefeuille': 'ميل فوي', 'millefeuillecafe': 'ميل فوي قهوة', 'tarte': 'تارت', 'tartelette': 'تارتلات',
  'cheesecake': 'تشيز كيك', 'brownies': 'براوني', 'donuts': 'دونات', 'chausson': 'شوسون',
  'panini': 'بانيني', 'pizza': 'بيتزا', 'nem': 'نيم', 'roll': 'رول', 'buns': 'بنز',
  'cornet': 'كورنيه', 'cigare': 'سيجار', 'triangle': 'مثلث', 'entremet': 'كيك دائري',
  'gateau': 'كيك', 'gâteau': 'كيك', 'gateaux': 'كيك', 'gâteaux': 'كيك', 'plateau': 'طبق',
  // Goûts / ingrédients
  'chocolat': 'شوكولاطة', 'chocola': 'شوكولاطة', 'caramel': 'كراميل', 'citron': 'ليمون',
  'limona': 'ليمونة', 'framboise': 'توت العليق', 'praline': 'برالين', 'vanille': 'فانيليا',
  'pistache': 'فستق', 'amande': 'لوز', 'damande': 'باللوز', 'fromage': 'جبن', 'fromaja': 'جبن',
  'lait': 'حليب', 'sucre': 'سكر', 'miel': 'عسل', 'noir': 'أسود', 'royal': 'رويال',
  'poisson': 'سمك', 'thon': 'تونة', 'poulet': 'دجاج', 'viande': 'لحم', 'hachée': 'مفروم',
  'hachee': 'مفروم', 'kefta': 'كفتة', 'épinards': 'سبانخ', 'epinards': 'سبانخ', 'fruit': 'فواكه',
  'fruits': 'فواكه', 'mer': 'بحر', 'sel': 'ملح',
  // Formes / tailles
  'coeur': 'قلب', 'larme': 'دمعة', 'rond': 'دائري', 'ronde': 'دائري', 'carré': 'مربع', 'carre': 'مربع',
  'tranche': 'شريحة', 'layer': 'طبقة', 'grand': 'كبير', 'grande': 'كبير', 'petit': 'صغير',
  'petite': 'صغير', 'mini': 'ميني', 'moyen': 'متوسط',
  // Qualificatifs
  'sale': 'مالح', 'salé': 'مالح', 'sans': 'بدون', 'complet': 'كامل', 'normal': 'عادي',
  'normale': 'عادي', 'special': 'خاص', 'spécial': 'خاص', 'variée': 'متنوع', 'variee': 'متنوع',
  'beldi': 'بلدي', 'americain': 'أمريكي', 'américain': 'أمريكي', 'espagnol': 'إسباني',
  'nouveau': 'جديد', 'new': 'جديد', 'soirée': 'سهرة', 'soiree': 'سهرة', 'fiancaille': 'خطوبة',
  'fiançailles': 'خطوبة', 'semoule': 'سميدة', 'pate': 'عجينة', 'pâte': 'عجينة',
  // Connecteurs français les plus courants dans les noms
  'au': 'ب', 'aux': 'ب', 'à': 'ب', 'a': 'ب', 'de': '', 'du': '', 'la': '', 'le': '', 'et': 'و',
}

// cm / kg / h10.. / nombres : on les garde identiques dans les deux langues
const KEEP_AS_IS = /^(\d+([.,]\d+)?(cm|kg|g|h\d+)?|h\d+)$/i

export function autoTranslateProductNameToAr(name) {
  if (!name) return name
  return name
    .split(/(\s+)/) // garde les espaces pour reconstruire la chaîne à l'identique
    .map((token) => {
      if (/^\s+$/.test(token) || token === '') return token
      const clean = token.replace(/[().,]/g, '')
      if (KEEP_AS_IS.test(clean)) return token
      const lower = clean.toLowerCase()
      const translated = WORD_DICTIONARY[lower]
      if (translated === undefined) return token // mot inconnu : on le laisse tel quel
      // Réinjecte la ponctuation d'origine autour du mot traduit
      return token.replace(clean, translated)
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

// Nom à afficher pour un produit selon la langue active :
// - FR : toujours product.name (catalogue de base)
// - AR : product.nameAr (saisi par l'admin) sinon traduction automatique
export function getProductDisplayName(product, lang) {
  if (!product) return ''
  if (lang !== 'ar') return product.name
  return product.nameAr && product.nameAr.trim() ? product.nameAr : autoTranslateProductNameToAr(product.name)
}

// Libellé de catégorie selon la langue (voir labelAr ajouté dans data/products.js)
export function getCategoryLabel(category, lang) {
  if (!category) return ''
  if (lang === 'ar' && category.labelAr) return category.labelAr
  return category.label
}
