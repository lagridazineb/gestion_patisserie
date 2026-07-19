// Dictionnaire de traduction de l'interface (FR / AR). Organisé par "namespace" (nav, login,
// produits, preparateur, common...). Utilisé via useLanguage().t('namespace.cle').
//
// Toutes les pages ne sont pas (encore) couvertes : voir README_I18N.md à la racine du projet
// pour la liste de ce qui est traduit et comment étendre à une nouvelle page.
export const translations = {
  fr: {
    common: {
      appName: 'Pâtisserie Dianna', loading: 'Chargement...', save: 'Enregistrer', saving: 'Enregistrement...',
      cancel: 'Annuler', add: 'Ajouter', edit: 'Modifier', delete: 'Supprimer', close: 'Fermer',
      search: 'Rechercher', confirm: 'Confirmer', yes: 'Oui', no: 'Non', total: 'Total',
      langButtonLabel: 'العربية', // ce que le bouton propose de basculer VERS, en FR on montre "العربية"
    },
    nav: {
      caisse: 'Caisse', bilan: 'Bilan & Dépôts', commande: 'Commande', suiviCommandes: 'Suivi commandes',
      stock: 'Stock', stockVide: 'Stock vidé', produits: 'Produits', historique: 'Historique',
      ventes: 'Ventes', remboursement: 'Remboursement', achats: 'Achats', production: 'Production',
      utilisateurs: 'Utilisateurs',
      deconnexion: 'Déconnexion', connexion: 'Connexion', administrateur: 'Administrateur',
      preparateur: 'Préparateur', caissier: 'Caissier',
      connecteMessage: "Connectez-vous en tant qu'administrateur ou préparateur pour accéder à votre espace.",
      boulangerieCafe: 'Boulangerie · Café', retourCaisse: 'Retour à la Caisse',
    },
    login: {
      systeme: 'Système de gestion', connexion: 'Connexion', email: 'Email', motDePasse: 'Mot de passe',
      seConnecter: 'Se connecter', connexionReussie: 'Connexion réussie',
    },
    produits: {
      catalogue: 'Catalogue', titre: 'Produits', produitsMasques: 'Produits masqués',
      ajouterProduit: 'Ajouter un produit', rechercherProduit: 'Rechercher un produit...',
      aucunProduitMasque: 'Aucun produit masqué.', reafficher: 'Réafficher', ajoute: 'ajouté',
      modifierProduit: 'Modifier le produit', ajouterProduitTitre: 'Ajouter un produit',
      nomProduit: 'Nom du produit (français)', nomProduitAr: 'Nom du produit (arabe)',
      nomProduitArHelp: "Laisser vide pour utiliser une traduction automatique approximative.",
      prix: 'Prix (DH)', categorie: 'Catégorie', image: 'Image', url: 'URL', telecharger: 'Télécharger',
      choisirImage: 'Choisir une image sur cet appareil', apercu: 'Aperçu',
      produitAjoute: 'Produit ajouté avec succès', produitModifie: 'Produit modifié avec succès',
      produitSupprime: 'Produit supprimé', produitReaffiche: 'Produit réaffiché',
      erreurChargement: 'Impossible de charger le catalogue depuis le serveur',
      erreurAjout: "Erreur lors de l'ajout du produit", erreurModification: 'Erreur lors de la modification du produit',
      erreurSuppression: 'Erreur lors de la suppression', erreurRestauration: 'Erreur lors de la restauration',
      nomRequis: 'Le nom du produit est requis', prixInvalide: 'Le prix doit être un nombre supérieur à 0',
      imageTropLourde: 'Image trop lourde (max 4 Mo)', imageIllisible: 'Impossible de lire cette image',
    },
    preparateur: {
      atelier: 'Atelier', bienvenue: 'Bonjour, {name}. Enregistrez votre production ci-dessous.',
      commandesAPreparer: 'Commandes à préparer', commandesAPreparerDesc: 'Produits réservés par les clients, à préparer pour votre atelier',
      aucuneCommandeAttente: "Aucune commande en attente pour votre atelier",
      terminee: 'Terminée', commandesTerminees: 'Commandes terminées',
      commandesTermineesDesc: 'Cliquez sur "Prête" pour savoir si le client a payé, sans afficher le prix',
      aucuneCommandeTerminee: 'Aucune commande terminée pour le moment', ticketNo: 'Ticket n°{n}',
      paye: 'Payé', nonPaye: 'Non payé', prete: 'Prête', note: 'Note :',
      nouvelleProduction: 'Nouvelle production', tranche: 'Tranche', entremets: 'Entremets circulaires',
      kg: 'Gâteau par kg', produitAChoisir: 'Le produit (cliquer pour choisir)',
      choisirProduit: '⚠️ Veuillez choisir un produit dans la liste ci-dessus.', realise: 'Réalisé',
      piece: 'pièce', kgUnit: 'kg', quantiteFabriquee: 'Quantité fabriquée', quantitePlaceholder: 'ex: 400 ou 1.5',
      date: 'Date', heure: 'Heure', enregistrerProduction: 'Enregistrer la production',
      journalProduction: 'Journal de production', aucuneProduction: 'Aucune production enregistrée',
      stockActuel: 'Stock actuel en boutique (global)', productionEnregistree: 'Production enregistrée : {name} +{qty}',
      preparationTerminee: 'Préparation marquée comme terminée',
    },
  },
  ar: {
    common: {
      appName: 'باتيسري ديانا', loading: 'جارٍ التحميل...', save: 'حفظ', saving: 'جارٍ الحفظ...',
      cancel: 'إلغاء', add: 'إضافة', edit: 'تعديل', delete: 'حذف', close: 'إغلاق',
      search: 'بحث', confirm: 'تأكيد', yes: 'نعم', no: 'لا', total: 'المجموع',
      langButtonLabel: 'Français',
    },
    nav: {
      caisse: 'الصندوق', bilan: 'الحساب والودائع', commande: 'الطلبات', suiviCommandes: 'متابعة الطلبات',
      stock: 'المخزون', stockVide: 'المخزون المفرغ', produits: 'المنتجات', historique: 'السجل',
      ventes: 'المبيعات', remboursement: 'الاسترجاع', achats: 'المشتريات', production: 'الإنتاج',
      utilisateurs: 'المستخدمون',
      deconnexion: 'تسجيل الخروج', connexion: 'تسجيل الدخول', administrateur: 'مدير',
      preparateur: 'محضّر', caissier: 'أمين الصندوق',
      connecteMessage: 'سجّل الدخول كمدير أو محضّر للوصول إلى مساحتك.',
      boulangerieCafe: 'مخبزة · مقهى', retourCaisse: 'الرجوع إلى الصندوق',
    },
    login: {
      systeme: 'نظام التسيير', connexion: 'تسجيل الدخول', email: 'البريد الإلكتروني', motDePasse: 'كلمة المرور',
      seConnecter: 'تسجيل الدخول', connexionReussie: 'تم تسجيل الدخول بنجاح',
    },
    produits: {
      catalogue: 'الكتالوج', titre: 'المنتجات', produitsMasques: 'منتجات مخفية',
      ajouterProduit: 'إضافة منتج', rechercherProduit: 'البحث عن منتج...',
      aucunProduitMasque: 'لا يوجد أي منتج مخفي.', reafficher: 'إظهار من جديد', ajoute: 'مضاف',
      modifierProduit: 'تعديل المنتج', ajouterProduitTitre: 'إضافة منتج',
      nomProduit: 'اسم المنتج (بالفرنسية)', nomProduitAr: 'اسم المنتج (بالعربية)',
      nomProduitArHelp: 'اتركه فارغاً لاستعمال ترجمة تلقائية تقريبية.',
      prix: 'الثمن (درهم)', categorie: 'الفئة', image: 'الصورة', url: 'رابط', telecharger: 'تحميل من الجهاز',
      choisirImage: 'اختر صورة من هذا الجهاز', apercu: 'معاينة',
      produitAjoute: 'تمت إضافة المنتج بنجاح', produitModifie: 'تم تعديل المنتج بنجاح',
      produitSupprime: 'تم حذف المنتج', produitReaffiche: 'تم إظهار المنتج من جديد',
      erreurChargement: 'تعذر تحميل الكتالوج من الخادم',
      erreurAjout: 'خطأ أثناء إضافة المنتج', erreurModification: 'خطأ أثناء تعديل المنتج',
      erreurSuppression: 'خطأ أثناء الحذف', erreurRestauration: 'خطأ أثناء إعادة الإظهار',
      nomRequis: 'اسم المنتج مطلوب', prixInvalide: 'يجب أن يكون الثمن رقماً أكبر من 0',
      imageTropLourde: 'الصورة كبيرة جداً (الحد الأقصى 4 ميغا)', imageIllisible: 'تعذرت قراءة هذه الصورة',
    },
    preparateur: {
      atelier: 'الورشة', bienvenue: 'أهلاً، {name}. سجّل إنتاجك في الأسفل.',
      commandesAPreparer: 'الطلبات الجاهزة للتحضير', commandesAPreparerDesc: 'منتجات حجزها الزبناء، يجب تحضيرها لورشتك',
      aucuneCommandeAttente: 'لا توجد طلبات في الانتظار لورشتك',
      terminee: 'منتهي', commandesTerminees: 'الطلبات المنتهية',
      commandesTermineesDesc: 'اضغط على "جاهزة" لمعرفة إذا كان الزبون قد أدى الثمن، دون إظهار السعر',
      aucuneCommandeTerminee: 'لا توجد طلبات منتهية حالياً', ticketNo: 'التذكرة رقم {n}',
      paye: 'تم الأداء', nonPaye: 'لم يتم الأداء', prete: 'جاهزة', note: 'ملاحظة:',
      nouvelleProduction: 'إنتاج جديد', tranche: 'شريحة', entremets: 'الكيك الدائري',
      kg: 'الكيك بالكيلو', produitAChoisir: 'المنتج (اضغط للاختيار)',
      choisirProduit: '⚠️ الرجاء اختيار منتج من القائمة أعلاه.', realise: 'أُنجز',
      piece: 'قطعة', kgUnit: 'كغ', quantiteFabriquee: 'الكمية المصنوعة', quantitePlaceholder: 'مثال: 400 أو 1.5',
      date: 'التاريخ', heure: 'الوقت', enregistrerProduction: 'تسجيل الإنتاج',
      journalProduction: 'سجل الإنتاج', aucuneProduction: 'لا يوجد إنتاج مسجل',
      stockActuel: 'المخزون الحالي في المحل (عام)', productionEnregistree: 'تم تسجيل الإنتاج: {name} +{qty}',
      preparationTerminee: 'تم تحديد التحضير كمنتهي',
    },
  },
}

// Petit helper de formatage type "Bonjour {name}" -> remplace {name} par une valeur.
export function formatT(str, vars = {}) {
  if (typeof str !== 'string') return str
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), str)
}
