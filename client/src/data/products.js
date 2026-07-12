// Catégories affichées dans la Caisse (POS) : liste plate, inchangée par rapport à l'origine.
export const CATEGORIES_POS = [
  { id: "pain", label: "Pain", image: "/category-images/pain.jpg" },
  { id: "viennoiserie", label: "Viennoiserie", image: "/category-images/viennoiserie.jpg" },
  { id: "millefeuille", label: "Millefeuille / Cake", image: "/category-images/millefeuille.jpg" },
  { id: "gateau_maroc", label: "Gâteau Marocain", image: "/category-images/gateau_maroc.jpg" },
  { id: "entremet", label: "Entremets", image: "/category-images/entremet.jpg" },
  { id: "patisserie", label: "Pâtisserie", image: "/category-images/patisserie.jpg" },
  { id: "sale", label: "Salé", image: "/category-images/sale.jpg" },
  { id: "rziza", label: "Rziza", image: "/category-images/rziza.jpg" },
  { id: "frigo_entremet", label: "Frigo Entremet", image: "/category-images/entremet.jpg" },
];

// Catégories affichées uniquement dans la page "Commande" (grande commande / réservation) :
// structure imbriquée reprenant l'intégralité du catalogue transmis (Cake Design, Gâteaux
// Kg, Pâtisserie/Cafe, etc.). Ne touche pas à la Caisse normale.
export const CATEGORIES_COMMANDE = [
  {
    id: "cake_design",
    label: "Cake Design",
    image: "/category-images/entremet.jpg",
  },
  {
    id: "gateaux",
    label: "Gâteaux",
    image: "/category-images/entremet.jpg",
    children: [
      { id: "entremet", label: "Entremets", image: "/category-images/entremet.jpg" },
      { id: "gateaux_kg", label: "Gâteaux Kg", image: "/category-images/gateau_maroc.jpg" },
    ],
  },
  { id: "gateau_maroc", label: "Gateaux marocain", image: "/category-images/gateau_maroc.jpg" },
  { id: "millefeuille", label: "Millefeuille/Cake", image: "/category-images/millefeuille.jpg" },
  { id: "pain", label: "Pain", image: "/category-images/pain.jpg" },
  { id: "patisserie", label: "Patisserie", image: "/category-images/patisserie.jpg" },
  { id: "patisserie_cafe", label: "Pâtisserie/Cafe", image: "/category-images/patisserie.jpg" },
  { id: "sale", label: "Sale", image: "/category-images/sale.jpg" },
 { id: "viennoiserie", label: "Viennoiserie", image: "/category-images/viennoiserie.jpg" },
  { id: "rziza", label: "Rziza", image: "/category-images/rziza.jpg" },
];

// "Frigo Entremet" (Caisse) : fusionne les Entremets circulaires ET les Gâteaux au kg
// produits par le préparateur pâtisserie — ils n'apparaissent plus séparément à la caisse.
export const FRIGO_ENTREMET_SOURCE_CATEGORIES = ["gateaux_kg"]
export function getFrigoEntremetProducts() {
  return FRIGO_ENTREMET_SOURCE_CATEGORIES.flatMap((cat) => (PRODUCTS[cat] || []).map((p) => ({ ...p, category: cat })))
}

// Renvoie la définition (top-level ou enfant) d'une catégorie à partir de son id,
// en cherchant dans la structure imbriquée utilisée par la page Commande.
export function findCategory(id) {
  for (const cat of CATEGORIES_COMMANDE) {
    if (cat.id === id) return cat;
    if (cat.children) {
      const child = cat.children.find((c) => c.id === id);
      if (child) return child;
    }
  }
  return CATEGORIES_POS.find((c) => c.id === id) || null;
}

// Liste "aplatie" des catégories qui contiennent réellement des produits (utile pour
// les formulaires d'administration où une catégorie parente comme "Gâteaux" ne doit pas
// apparaître, seules ses sous-catégories "Entremets" / "Gâteaux Kg" le doivent).
export const LEAF_CATEGORIES = CATEGORIES_COMMANDE.flatMap((cat) => cat.children ? cat.children : [cat])

export const PRODUCTS = {
  cake_design: [
    // "Layer hXX" = type de hauteur. Cliquer dessus ouvre une sélection des tailles
    // disponibles (Layer 10/hXX à 30/hXX), chacune avec son propre prix (voir LAYER_VARIANTS).
    { id: "layer_h10", name: "Layer h10", price: 100, unit: "piece", image: null, stock: 0, isLayerType: true, layerHeight: 10 },
    { id: "layer_h15", name: "Layer h15", price: 150, unit: "piece", image: null, stock: 0, isLayerType: true, layerHeight: 15 },
    { id: "layer_h20", name: "Layer h20", price: 200, unit: "piece", image: null, stock: 0, isLayerType: true, layerHeight: 20 },
    { id: "layer_h25", name: "Layer h25", price: 250, unit: "piece", image: null, stock: 0, isLayerType: true, layerHeight: 25 },
    { id: "layer_h30", name: "Layer h30", price: 300, unit: "piece", image: null, stock: 0, isLayerType: true, layerHeight: 30 },
  ],
  entremet: [
    { id: "e1", name: "Caramel Coeur 18cm", price: 138.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e2", name: "Caramel Coeur 20cm", price: 157.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e3", name: "Caramel Coeur 22cm", price: 192.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e4", name: "Caramel Coeur 24cm", price: 220.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e5", name: "Caramel Coeur 26cm", price: 236.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e6", name: "Caramel Larme 18cm", price: 124.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CARAMEL%20Coeur.jpg", stock: 0 },
    { id: "e7", name: "Caramel Larme 20cm", price: 144.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CARAMEL%20Coeur.jpg", stock: 0 },
    { id: "e8", name: "Caramel Rond 18cm", price: 143.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e9", name: "Caramel Rond 20cm", price: 156.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e10", name: "Caramel Rond 22cm", price: 175.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e11", name: "Caramel Rond 24cm", price: 220.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e12", name: "Caramel Rond 26cm", price: 240.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramelrontentremet.jpg", stock: 0 },
    { id: "e13", name: "Chocolat Noir Coeur 18cm", price: 141.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "e14", name: "Chocolat Noir Coeur 20cm", price: 156.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "e15", name: "Chocolat Noir Coeur 22cm", price: 219.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "e16", name: "Chocolat Noir Coeur 24cm", price: 260.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "e17", name: "Chocolat Noir Coeur 26cm", price: 286.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "e18", name: "Chocolat Noir Larme 18cm", price: 130.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chocolalarmnoir.jpg", stock: 0 },
    { id: "e19", name: "Chocolat Noir Larme 20cm", price: 148.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chocolalarmnoir.jpg", stock: 0 },
    { id: "e20", name: "Chocolat Noir Rond 18cm", price: 134.00, unit: "piece", image: "https://vente.gstdianna.ma/images/1_chocolat_royale_rond.jpg", stock: 0 },
    { id: "e21", name: "Chocolat Noir Rond 20cm", price: 195.00, unit: "piece", image: "https://vente.gstdianna.ma/images/1_chocolat_royale_rond.jpg", stock: 0 },
    { id: "e22", name: "Chocolat Noir Rond 22cm", price: 202.00, unit: "piece", image: "https://vente.gstdianna.ma/images/1_chocolat_royale_rond.jpg", stock: 0 },
    { id: "e23", name: "Chocolat Noir Rond 24cm", price: 247.00, unit: "piece", image: "https://vente.gstdianna.ma/images/1_chocolat_royale_rond.jpg", stock: 0 },
    { id: "e24", name: "Chocolat Noir Rond 26cm", price: 273.00, unit: "piece", image: "https://vente.gstdianna.ma/images/1_chocolat_royale_rond.jpg", stock: 0 },
    { id: "e25", name: "Chocolat Royal Coeur 18cm", price: 106.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHOCOCOURR.jpg", stock: 0 },
    { id: "e26", name: "Chocolat Royal Coeur 20cm", price: 125.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHOCOCOURR.jpg", stock: 0 },
    { id: "e27", name: "Chocolat Royal Coeur 22cm", price: 125.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHOCOCOURR.jpg", stock: 0 },
    { id: "e28", name: "Chocolat Royal Coeur 24cm", price: 195.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHOCOCOURR.jpg", stock: 0 },
    { id: "e29", name: "Chocolat Royal Coeur 26cm", price: 254.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHOCOCOURR.jpg", stock: 0 },
    { id: "e30", name: "Chocolat Royal Larme 18cm", price: 151.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHCOLARMER.jpg", stock: 0 },
    { id: "e31", name: "Chocolat Royal Larme 20cm", price: 162.00, unit: "piece", image: "https://vente.gstdianna.ma/images/CHCOLARMER.jpg", stock: 0 },
    { id: "e32", name: "Chocolat Royal Rond 18cm", price: 143.00, unit: "piece", image: "https://vente.gstdianna.ma/images/RONDCHOCOLAROYAL.jpg", stock: 0 },
    { id: "e33", name: "Chocolat Royal Rond 20cm", price: 148.00, unit: "piece", image: "https://vente.gstdianna.ma/images/RONDCHOCOLAROYAL.jpg", stock: 0 },
    { id: "e34", name: "Chocolat Royal Rond 22cm", price: 203.00, unit: "piece", image: "https://vente.gstdianna.ma/images/RONDCHOCOLAROYAL.jpg", stock: 0 },
    { id: "e35", name: "Chocolat Royal Rond 24cm", price: 235.00, unit: "piece", image: "https://vente.gstdianna.ma/images/RONDCHOCOLAROYAL.jpg", stock: 0 },
    { id: "e36", name: "Chocolat Royal Rond 26cm", price: 271.00, unit: "piece", image: "https://vente.gstdianna.ma/images/RONDCHOCOLAROYAL.jpg", stock: 0 },
    { id: "e37", name: "Citron Coeur 18cm", price: 95.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citroncoeur.jpg", stock: 0 },
    { id: "e38", name: "Citron Coeur 20cm", price: 125.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citroncoeur.jpg", stock: 0 },
    { id: "e39", name: "Citron Coeur 22cm", price: 155.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citroncoeur.jpg", stock: 0 },
    { id: "e40", name: "Citron Coeur 24cm", price: 183.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citroncoeur.jpg", stock: 0 },
    { id: "e41", name: "Citron Coeur 26cm", price: 217.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citroncoeur.jpg", stock: 0 },
    { id: "e42", name: "Citron Larme 18cm", price: 109.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20larm.jpg", stock: 0 },
    { id: "e43", name: "Citron Larme 20cm", price: 130.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20larm.jpg", stock: 0 },
    { id: "e44", name: "Citron Rond 18cm", price: 116.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20rond.jpg", stock: 0 },
    { id: "e45", name: "Citron Rond 20cm", price: 148.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20rond.jpg", stock: 0 },
    { id: "e46", name: "Citron Rond 22cm", price: 158.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20rond.jpg", stock: 0 },
    { id: "e47", name: "Citron Rond 24cm", price: 201.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20rond.jpg", stock: 0 },
    { id: "e48", name: "Citron Rond 26cm", price: 230.00, unit: "piece", image: "https://vente.gstdianna.ma/images/citron%20rond.jpg", stock: 0 },
    { id: "e49", name: "Framboise Chocolat Coeur 18cm", price: 130.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e50", name: "Framboise Chocolat Coeur 20cm", price: 143.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e51", name: "Framboise Chocolat Coeur 22cm", price: 202.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e52", name: "Framboise Chocolat Coeur 24cm", price: 260.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e53", name: "Framboise Chocolat Coeur 26cm", price: 284.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e54", name: "Framboise Chocolat Larme 18cm", price: 123.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FROMBOISELARM.jpg", stock: 0 },
    { id: "e55", name: "Framboise Chocolat Larme 20cm", price: 156.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FROMBOISELARM.jpg", stock: 0 },
    { id: "e56", name: "Framboise Chocolat Rond 18cm", price: 134.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISROND.jpg", stock: 0 },
    { id: "e57", name: "Framboise Chocolat Rond 20cm", price: 163.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISROND.jpg", stock: 0 },
    { id: "e58", name: "Framboise Chocolat Rond 22cm", price: 174.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISROND.jpg", stock: 0 },
    { id: "e59", name: "Framboise Chocolat Rond 24cm", price: 249.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISROND.jpg", stock: 0 },
    { id: "e60", name: "Framboise Chocolat Rond 26cm", price: 290.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISROND.jpg", stock: 0 },
    { id: "e61", name: "Framboise Coeur 18cm", price: 116.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e62", name: "Framboise Coeur 20cm", price: 138.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e63", name: "Framboise Coeur 22cm", price: 155.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e64", name: "Framboise Coeur 24cm", price: 181.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e65", name: "Framboise Coeur 26cm", price: 227.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "e66", name: "Framboise Larme 18cm", price: 114.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FROMBOISELARM.jpg", stock: 0 },
    { id: "e67", name: "Framboise Larme 20cm", price: 122.00, unit: "piece", image: "https://vente.gstdianna.ma/images/FROMBOISELARM.jpg", stock: 0 },
    { id: "e68", name: "Framboise Rond 18cm", price: 124.00, unit: "piece", image: "https://vente.gstdianna.ma/images/fromboisrondentremet.jpg", stock: 0 },
    { id: "e69", name: "Framboise Rond 20cm", price: 150.00, unit: "piece", image: "https://vente.gstdianna.ma/images/fromboisrondentremet.jpg", stock: 0 },
    { id: "e70", name: "Framboise Rond 22cm", price: 164.00, unit: "piece", image: "https://vente.gstdianna.ma/images/fromboisrondentremet.jpg", stock: 0 },
    { id: "e71", name: "Framboise Rond 24cm", price: 176.00, unit: "piece", image: "https://vente.gstdianna.ma/images/fromboisrondentremet.jpg", stock: 0 },
    { id: "e72", name: "Framboise Rond 26cm", price: 235.00, unit: "piece", image: "https://vente.gstdianna.ma/images/fromboisrondentremet.jpg", stock: 0 },
    { id: "e73", name: "Praline Ifili Coeur 18cm", price: 131.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINICOUR.jpg", stock: 0 },
    { id: "e74", name: "Praline Ifili Coeur 20cm", price: 180.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINICOUR.jpg", stock: 0 },
    { id: "e75", name: "Praline Ifili Coeur 22cm", price: 204.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINICOUR.jpg", stock: 0 },
    { id: "e76", name: "Praline Ifili Coeur 24cm", price: 217.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINICOUR.jpg", stock: 0 },
    { id: "e77", name: "Praline Ifili Coeur 26cm", price: 244.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINICOUR.jpg", stock: 0 },
    { id: "e78", name: "Praline Ifili Larme 18cm", price: 142.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRIFILILARME.jpg", stock: 0 },
    { id: "e79", name: "Praline Ifili Larme 20cm", price: 165.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRIFILILARME.jpg", stock: 0 },
    { id: "e80", name: "Praline Ifili Rond 18cm", price: 119.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINRON.jpg", stock: 0 },
    { id: "e81", name: "Praline Ifili Rond 20cm", price: 161.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINRON.jpg", stock: 0 },
    { id: "e82", name: "Praline Ifili Rond 22cm", price: 190.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINRON.jpg", stock: 0 },
    { id: "e83", name: "Praline Ifili Rond 24cm", price: 225.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINRON.jpg", stock: 0 },
    { id: "e84", name: "Praline Ifili Rond 26cm", price: 261.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PRINLINRON.jpg", stock: 0 },
    { id: "e85", name: "Vanille Coeur 18cm", price: 99.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
    { id: "e86", name: "Vanille Coeur 20cm", price: 167.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
    { id: "e87", name: "Vanille Coeur 22cm", price: 178.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
    { id: "e88", name: "Vanille Coeur 24cm", price: 202.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
    { id: "e89", name: "Vanille Coeur 26cm", price: 229.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
    { id: "e90", name: "Vanille Larme 18cm", price: 141.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILARM.jpg", stock: 0 },
    { id: "e91", name: "Vanille Larme 20cm", price: 143.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILARM.jpg", stock: 0 },
    { id: "e92", name: "Vanille Rond 18cm", price: 130.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILROND.jpg", stock: 0 },
    { id: "e93", name: "Vanille Rond 20cm", price: 143.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILROND.jpg", stock: 0 },
    { id: "e94", name: "Vanille Rond 22cm", price: 171.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILROND.jpg", stock: 0 },
    { id: "e95", name: "Vanille Rond 24cm", price: 210.00, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILROND.jpg", stock: 0 },
    { id: "e96", name: "Vanille Rond 26cm", price: 0, unit: "piece", image: "https://vente.gstdianna.ma/images/VANILROND.jpg", stock: 0 },  // TODO: prix manquant dans la liste fournie
  ],
  gateaux_kg: [
    { id: "gk1", name: "Caramel chocolat", price: 130.00, unit: "kg", image: "https://vente.gstdianna.ma/images/caramel.jpg", stock: 0 },
    { id: "gk2", name: "Chocolat framboise", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/FRAMBOISCOUR.jpg", stock: 0 },
    { id: "gk3", name: "Chocolat noir", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "gk4", name: "Chocolat royal", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/CHOCOCOURR.jpg", stock: 0 },
    { id: "gk5", name: "Citron", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/citroncoeur.jpg", stock: 0 },
    { id: "gk6", name: "Fiancaille Vanille chocolat", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
    { id: "gk7", name: "Framboise pistache", price: 130.00, unit: "kg", image: "https://vente.gstdianna.ma/images/fromboisrondentremet.jpg", stock: 0 },
    { id: "gk8", name: "Pate à sucre", price: 170.00, unit: "kg", image: null, stock: 0 },
    { id: "gk9", name: "Pâte d'amande", price: 150.00, unit: "kg", image: null, stock: 0 },
    { id: "gk10", name: "Praline chocolat", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/PRINLINICOUR.jpg", stock: 0 },
    { id: "gk11", name: "Soirée variée", price: 4.00, unit: "piece", image: null, stock: 0 },
    { id: "gk12", name: "Vanille chocolat", price: 130.00, unit: "kg", image: "https://vente.gstdianna.ma/images/VANICOUR.jpg", stock: 0 },
  ],
  gateau_maroc: [
    { id: "g2", name: "Amande kg", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/amonde.jpg", stock: 0 },
    { id: "g3", name: "Sable kg", price: 95.00, unit: "kg", image: "https://vente.gstdianna.ma/images/sable.jpg", stock: 0 },
    { id: "g4", name: "Cornet gazelle/kg", price: 160.00, unit: "kg", image: "https://vente.gstdianna.ma/images/CORNETGAZELLE.jpg", stock: 0 },
    { id: "g7", name: "M3assal", price: 180.00, unit: "kg", image: null, stock: 0 },
    { id: "g8", name: "Mini plateau amande", price: 115.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaugr.jpg", stock: 0 },
    { id: "g9", name: "Mini Plateau sable", price: 65.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaugr.jpg", stock: 0 },
    { id: "g10", name: "Plateau 3 amande 3 sable", price: 170.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaugr.jpg", stock: 0 },
    { id: "g11", name: "Plateau 5 amande 1 sable", price: 210.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaugr.jpg", stock: 0, excludeFromCaisse: true },
    { id: "g12", name: "Plateau 4 amande 2 sable", price: 190.00, unit: "piece", image: "https://vente.gstdianna.ma/images/prod_68e2d8ed32f271.46554972.jpg", stock: 0 },
    { id: "g13", name: "Plateau 2 amande 4 sable", price: 150.00, unit: "piece", image: "https://vente.gstdianna.ma/images/prod_68e2d8d3a82ec1.48128314.jpg", stock: 0 },
    { id: "g14", name: "Mini Plateau 3 amande 1 Sable", price: 100.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaupeti.jpg", stock: 0, excludeFromCaisse: true },
    { id: "g15", name: "Mini plateau 2 amande 2 sable", price: 90.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaupeti.jpg", stock: 0 },
    { id: "g16", name: "Mini plateau 1 amande 3 sable", price: 80.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaupeti.jpg", stock: 0, excludeFromCaisse: true },
    { id: "g17", name: "Plateau 1 amande 5 sable", price: 140.00, unit: "piece", image: "https://vente.gstdianna.ma/images/prod_68e2d8adc23521.48739177.jpg", stock: 0, excludeFromCaisse: true },
    { id: "g18", name: "Grand plateau amande", price: 250.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaugr.jpg", stock: 0 },
    { id: "g19", name: "Grand plateau sable", price: 130.00, unit: "piece", image: "https://vente.gstdianna.ma/images/plateaugr.jpg", stock: 0 },
  ],
  millefeuille: [
    { id: "m1b", name: "Millefeuille.", price: 10.00, unit: "piece", image: "https://vente.gstdianna.ma/images/prod_68e2d0e2d10a45.85840191.jpg", stock: 0 },
    { id: "m3", name: "Brownies triangle", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/brownes.jpg", stock: 0 },
    { id: "m4", name: "Cake carré", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakecarre.jpg", stock: 0 },
    { id: "m5", name: "Tarte triangle", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/tarttraingl.jpg", stock: 0 },
    { id: "m6", name: "Tarte rond", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/tartrond.jpg", stock: 0 },
    { id: "m7", name: "Cake normal 45", price: 45.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakenirmal45.jpg", stock: 0 },
    { id: "m8", name: "Cake normal 35", price: 35.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakenormal35.jpg", stock: 0 },
    { id: "m9", name: "Cake normal 30", price: 30.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caknormal30.jpg", stock: 0 },
    { id: "m10", name: "Cake normal 20", price: 20.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakenormal20.jpg", stock: 0 },
    { id: "m11", name: "Cake chocolat 25", price: 25.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakechocola25.jpg", stock: 0 },
    { id: "m12", name: "Tartelette", price: 4.00, unit: "piece", image: "https://vente.gstdianna.ma/images/tartlait.jpg", stock: 0 },
    { id: "m13", name: "Tranche cake", price: 5.00, unit: "piece", image: "https://vente.gstdianna.ma/images/prod_68e2dbbe236956.91399320.jpg", stock: 0 },
  ],
  pain: [
    { id: "p1", name: "Pain semoule", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/painsoumoul.jpg", stock: 0 },
    { id: "p2", name: "Pain complet", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/paincmplet.jpg", stock: 0 },
    { id: "p3", name: "Pain normale grand", price: 1.20, unit: "piece", image: "https://vente.gstdianna.ma/images/PAINNORMALGRAND.jpg", stock: 0 },
    { id: "p4", name: "Pain normale petit", price: 1.00, unit: "piece", image: "https://vente.gstdianna.ma/images/painnormal.jpg", stock: 0 },
    { id: "p5", name: "Pain sans sel", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/painsanssell.jpg", stock: 0 },
    { id: "p6", name: "Pain beldi", price: 3.00, unit: "piece", image: "https://vente.gstdianna.ma/images/painbeldi.jpg", stock: 0 },
    { id: "p7", name: "Baguette semoule", price: 3.00, unit: "piece", image: "https://vente.gstdianna.ma/images/baquettesoumol.jpg", stock: 0 },
    { id: "p8", name: "Baguette complet", price: 3.00, unit: "piece", image: "https://vente.gstdianna.ma/images/baquettecomplet.jpg", stock: 0 },
    { id: "p9", name: "Baguette normale", price: 1.20, unit: "piece", image: "https://vente.gstdianna.ma/images/baguettenormal.jpg", stock: 0 },
    { id: "p10", name: "Baguette espagnol", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/espanol.jpg", stock: 0 },
    { id: "p11", name: "Bagette beldi", price: 5.00, unit: "piece", image: "https://vente.gstdianna.ma/images/bagettebeldi.jpg", stock: 0 },
    { id: "p12", name: "Mini baguette semoule", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/MINISOUMOUL.jpg", stock: 0 },
    { id: "p13", name: "Mini baguette complet", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/MINIBAGETTECOMP.jpg", stock: 0 },
    { id: "p14", name: "Mini baguette normale", price: 1.00, unit: "piece", image: "https://vente.gstdianna.ma/images/minibagettenormal.jpg", stock: 0 },
    { id: "p15", name: "Mini baguette beldi", price: 3.00, unit: "piece", image: "https://vente.gstdianna.ma/images/minibagettebeldi.jpg", stock: 0 },
    { id: "p16", name: "Pain au lait", price: 5.00, unit: "piece", image: "https://vente.gstdianna.ma/images/painoulait.jpg", stock: 0 },
    { id: "p17", name: "Panini", price: 1.50, unit: "piece", image: "https://vente.gstdianna.ma/images/prod_68e2dc87b244f3.26748346.jpg", stock: 0 },
    { id: "p18", name: "CHOUFAN", price: 4.00, unit: "piece", image: null, stock: 0 },
  ],
  patisserie: [
    { id: "pa1", name: "Boule", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/bolchocolat.jpg", stock: 0 },
    { id: "pa2", name: "Cake americain", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakeusachocolanoir.jpg", stock: 0 },
    { id: "pa3", name: "Cheesecake", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chezcakeorio.jpg", stock: 0 },
    { id: "pa4", name: "Chocolat noir", price: 15.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chococoeurentremet.jpg", stock: 0 },
    { id: "pa5", name: "Coeur", price: 15.00, unit: "piece", image: "https://vente.gstdianna.ma/images/bolefromboiz.jpg", stock: 0 },
  ],
  patisserie_cafe: [
    { id: "pc1", name: "Boule", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/bolchocolat.jpg", stock: 0 },
    { id: "pc2", name: "Coeur", price: 15.00, unit: "piece", image: "https://vente.gstdianna.ma/images/bolefromboiz.jpg", stock: 0 },
    { id: "pc3", name: "Cheesecake", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/chezcakeorio.jpg", stock: 0 },
    { id: "pc4", name: "Cake americain", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/cakeusachocolanoir.jpg", stock: 0 },
    { id: "pc5", name: "Snickers", price: 20.00, unit: "piece", image: null, stock: 0 },
    { id: "pc6", name: "Tranche 13", price: 13.00, unit: "piece", image: null, stock: 0 },
    { id: "pc7", name: "Tranche 15", price: 15.00, unit: "piece", image: null, stock: 0 },
    { id: "pc8", name: "Pate d'amande", price: 18.00, unit: "piece", image: null, stock: 0 },
    { id: "pc9", name: "Millefeuille/cafe", price: 8.00, unit: "piece", image: "https://vente.gstdianna.ma/images/millfeuil.jpg", stock: 0 },
    { id: "pc10", name: "Tranche lahbib", price: 10.00, unit: "piece", image: "https://vente.gstdianna.ma/images/ganage.jpg", stock: 0 },
    { id: "pc11", name: "Tranche normal", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/caramel.jpg", stock: 0 },
    { id: "pc12", name: "Tranche special", price: 14.50, unit: "piece", image: "https://vente.gstdianna.ma/images/snikers.jpg", stock: 0 },
  ],
  sale: [
    { id: "s1", name: "Pizza", price: 6.00, unit: "piece", image: "https://vente.gstdianna.ma/images/pizza.jpg", stock: 0 },
    { id: "s2", name: "Briwat poulet", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/briwatpoulet.jpg", stock: 0 },
    { id: "s3", name: "Nem poulet", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/nempoulet.jpg", stock: 0 },
    { id: "s4", name: "Nem poulet épinards", price: 12.00, unit: "piece", image: "https://vente.gstdianna.ma/images/nempouletepinag.jpg", stock: 0 },
    { id: "s5", name: "Nem viande hachée", price: 15.00, unit: "piece", image: "https://vente.gstdianna.ma/images/nemviandhacher.jpg", stock: 0 },
    { id: "s6", name: "Pastilla poulet", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/pastipoulet.jpg", stock: 0 },
    { id: "s7", name: "Pastilla fruit de mer", price: 18.00, unit: "piece", image: "https://vente.gstdianna.ma/images/pastfruitmer.jpg", stock: 0 },
    { id: "s8", name: "Kich", price: 10.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PLATSALE.jpg", stock: 0 },
    { id: "s9", name: "Chausson fromage", price: 8.00, unit: "piece", image: "https://vente.gstdianna.ma/images/GRANDPASPOULET.jpg", stock: 0 },
    { id: "s10", name: "Pizza beldi", price: 9.00, unit: "piece", image: "https://vente.gstdianna.ma/images/grandepasfruitmer.jpg", stock: 0 },
    { id: "s11", name: "Pain au thon", price: 10.00, unit: "piece", image: null, stock: 0 },
    { id: "s12", name: "Grande pastilla poulet", price: 150.00, unit: "kg", image: "https://vente.gstdianna.ma/images/GRANDPASPOULET.jpg", stock: 0 },
    { id: "s13", name: "Grande pastilla fruit de mer", price: 200.00, unit: "kg", image: "https://vente.gstdianna.ma/images/grandepasfruitmer.jpg", stock: 0 },
    { id: "s14", name: "Plateau sale", price: 180.00, unit: "piece", image: "https://vente.gstdianna.ma/images/PLATSALE.jpg", stock: 0 },
  ],
  viennoiserie: [
    { id: "v1", name: "Grand viennoiserie", price: 5.00, unit: "piece", image: "https://vente.gstdianna.ma/images/grandvinoi.jpg", stock: 0 },
    { id: "v2", name: "Petit viennoiserie", price: 3.00, unit: "piece", image: "https://vente.gstdianna.ma/images/minivinoiser.jpg", stock: 0 },
    { id: "v3", name: "Triangle chocolat", price: 5.00, unit: "piece", image: "https://vente.gstdianna.ma/images/traianglechocola.jpg", stock: 0 },
    { id: "v4", name: "Pain framboise", price: 6.00, unit: "piece", image: "https://vente.gstdianna.ma/images/painfromboiz.jpg", stock: 0 },
    { id: "v5", name: "Frange pain", price: 7.00, unit: "piece", image: "https://vente.gstdianna.ma/images/fronjipain.jpg", stock: 0 },
    { id: "v6", name: "Donuts", price: 7.00, unit: "piece", image: "https://vente.gstdianna.ma/images/donatee.jpg", stock: 0 },
    { id: "v7", name: "New york roll", price: 10.00, unit: "piece", image: "https://vente.gstdianna.ma/images/newyork.jpg", stock: 0 },
    { id: "v8", name: "Croissant special", price: 7.00, unit: "piece", image: "https://vente.gstdianna.ma/images/croissanspecial.jpg", stock: 0 },
    { id: "v9", name: "Mini croissant special", price: 5.00, unit: "piece", image: "https://vente.gstdianna.ma/images/minicroissantspecial.jpg", stock: 0 },
    { id: "v10", name: "Brioche buns", price: 3.00, unit: "piece", image: "https://vente.gstdianna.ma/images/BRIOCHB.jpg", stock: 0 },
  ],
  rziza: [
    { id: "r1", name: "Rziza", price: 5.50, unit: "piece", image: "https://vente.gstdianna.ma/images/rziza.jpg", stock: 0 },
  ],
};

export const ALL_PRODUCTS = Object.entries(PRODUCTS).flatMap(([catId, prods]) =>
  prods.map((p) => ({ ...p, category: catId }))
);

// Catégories de gâteaux pour lesquelles on peut ajouter une personnalisation
// (texte à écrire sur le gâteau + photo de référence, ex: anniversaire)
export const CUSTOMIZABLE_CATEGORIES = ["cake_design", "entremet", "gateaux_kg"];

// Certains ateliers couvrent plusieurs catégories de produits à la fois.
// Le préparateur "Pâtisserie" gère aussi les Entremets (même stock/production).
export const ATELIER_CATEGORY_GROUPS = {
  patisserie: ["patisserie", "entremet", "gateaux_kg"],
};

export function getAtelierCategories(atelier) {
  return ATELIER_CATEGORY_GROUPS[atelier] || [atelier];
}

// Composition du "Plateau sale" (salé) : liste unique, sélection d'un nombre fixe d'articles
export const SALE_PLATEAU_COMPONENTS = [
  { id: "sale_minipizza", name: "Mini Pizza", arabic: "ميني بيتزا" },
  { id: "sale_bastilla_poulet", name: "Bastilla poulet", arabic: "بيسطيلة دجاج" },
  { id: "sale_bastilla_hout", name: "Bastilla poisson", arabic: "بسطيلة حوت" },
  { id: "sale_cigare_kefta", name: "Cigare kefta", arabic: "سيكار كفتة" },
  { id: "sale_cigare_poulet", name: "Cigare poulet", arabic: "سيكار دجاج" },
  { id: "sale_nem_poulet", name: "Nem poulet", arabic: "نيم لزبنار دجاج" },
  { id: "sale_briouat_poulet", name: "Briouat poulet", arabic: "بروات دجاج" },
];

// Les plateaux de Gâteau Marocain n'ont pas leur propre stock : ils sont composés
// d'Amande (g2) et de Sable (g3) en kg. Vendre un plateau déduit directement le stock
// d'Amande/Sable selon SON grammage exact (pas une estimation par pièce).
export const AMANDE_KG_ID = "g2"
export const SABLE_KG_ID = "g3"
// amandeKg / sableKg = poids réel (en kg) d'amande / de sable utilisé par plateau vendu.
export const PLATEAU_COMPOSITION = {
  g8: { amandeKg: 0.773, sableKg: 0 },      // Mini plateau amande : 773g
  g9: { amandeKg: 0, sableKg: 0.613 },      // Mini Plateau sable : 613g
  g10: { amandeKg: 0.703, sableKg: 0.688 }, // Plateau 3 amande 3 sable : amande 703g, sable 688g
  g12: { amandeKg: 1.013, sableKg: 0.416 }, // Plateau 4 amande 2 sable : amande 1kg013g, sable 416g
  g13: { amandeKg: 0.513, sableKg: 0.813 }, // Plateau 2 amande 4 sable : amande 513g, sable 813g
  g15: { amandeKg: 0.430, sableKg: 0.340 }, // Mini plateau 2 amande 2 sable : amande 430g, sable 340g
  g18: { amandeKg: 1.445, sableKg: 0 },     // Grand plateau amande : 1kg445g
  g19: { amandeKg: 0, sableKg: 1.145 },     // Grand plateau sable : 1kg145g
}
export const SALE_PLATEAU_COMPOSITIONS = {
  s14: 6, // Plateau sale
};

// --- Cake Design : "Layer hXX" ---
// Chaque type "Layer hXX" (hauteur) propose 5 tailles (diamètre 10 à 30), chacune à un prix
// fixe = diamètre × 10 DH (10 -> 100DH, 15 -> 150DH, 20 -> 200DH, 25 -> 250DH, 30 -> 300DH).
export const LAYER_DIAMETERS = [10, 15, 20, 25, 30]
export function getLayerVariants(layerHeight) {
  return LAYER_DIAMETERS.map((d) => ({
    id: `layer_${d}_${layerHeight}`,
    name: `Layer ${d}/${layerHeight}`,
    price: d * 10,
  }))
}

export const ATELIERS = [
  { id: "pain", label: "Pain" },
  { id: "viennoiserie", label: "Viennoiserie" },
  { id: "patisserie", label: "Pâtisserie" },
  { id: "patisserie_cafe", label: "Pâtisserie/Cafe" },
  { id: "sale", label: "Salé" },
  { id: "gateau_maroc", label: "Gâteau Marocain" },
  { id: "entremet", label: "Entremets" },
  { id: "gateaux_kg", label: "Gâteaux Kg" },
  { id: "cake_design", label: "Cake Design" },
  { id: "melange", label: "Mélange" },
];

export const MOROCCAN_SABLE_COMPONENTS = [
  { id: "sable_afili", name: "Afili", arabic: "افيلي" },
  { id: "sable_kooftira", name: "Kooftira", arabic: "كوفتيرة" },
  { id: "sable_batou", name: "Batou", arabic: "باطو" },
  { id: "sable_kehla", name: "Kehla", arabic: "كحلة" },
  { id: "sable_kafi", name: "Kafi", arabic: "كافي" },
  { id: "sable_mayizina", name: "Mayizina", arabic: "مايزينة" },
  { id: "sable_dyamo", name: "Dyamo", arabic: "ديامو" },
  { id: "sable_faqas", name: "Faqas", arabic: "فقاص" },
  { id: "sable_ghariba", name: "Ghariba", arabic: "غريبة" },
  { id: "sable_fromaja", name: "Fromaja", arabic: "فرماجة" },
  { id: "sable_farmasil", name: "Farmasil Chocola", arabic: "فرميسيل شكولا" },
  { id: "sable_oryo", name: "Oryo", arabic: "اوريو" },
  { id: "sable_qualb", name: "Qualb Chocola", arabic: "قلب شكولا" },
];

export const MOROCCAN_AMANDE_COMPONENTS = [
  { id: "amande_kaba", name: "El Ka'ba", arabic: "الكعبة" },
  { id: "amande_kak", name: "El Ka'k", arabic: "الكعك" },
  { id: "amande_karkaa", name: "El Karka'a", arabic: "الكركاعة" },
  { id: "amande_warda", name: "El Warda", arabic: "الوردة" },
  { id: "amande_bsataj", name: "El Bsataj", arabic: "البسطاج" },
  { id: "amande_dama", name: "El Dam'a", arabic: "الدمعة" },
  { id: "amande_limona", name: "Limona", arabic: "ليمونة" },
  { id: "amande_lbish", name: "Lbish", arabic: "لبيش" },
  { id: "amande_karkaat_kehla", name: "Karkaat Kehla", arabic: "كركاعة كحلة" },
  { id: "amande_sriza", name: "Sriza", arabic: "سريزة" },
  { id: "amande_jawhra", name: "Jawhra", arabic: "جوهرة" },
  { id: "amande_maqrosa", name: "Maqrosa", arabic: "مقروصة" },
  { id: "amande_basma", name: "El Basma", arabic: "البصمة" },
];

export const MOROCCAN_CAKE_COMPOSITIONS = {
  g8: { amande: 4, sable: 0 },
  g9: { amande: 0, sable: 4 },
  g10: { amande: 3, sable: 3 },
  g11: { amande: 5, sable: 1 },
  g12: { amande: 4, sable: 2 },
  g13: { amande: 2, sable: 4 },
  g14: { amande: 3, sable: 1 },
  g15: { amande: 2, sable: 2 },
  g16: { amande: 1, sable: 3 },
  g17: { amande: 1, sable: 5 },
};

export const MOROCCAN_CAKE_DIVISION_TYPES = [
  "Cornet ET Gazelle",
  "Seulement Cornet",
  "Seulement Gazelle"
];

// Produits vendus au kg qui utilisent la composition générique "diviser en combien de
// sortes" (1 à 12), chacun avec sa propre liste de saveurs.
export const MOROCCAN_GENERIC_KG_COMPONENTS = {
  g2: MOROCCAN_AMANDE_COMPONENTS, // Amande kg
  g3: MOROCCAN_SABLE_COMPONENTS,  // Sable kg
};
