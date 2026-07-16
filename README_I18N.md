# Bouton de langue FR / AR — ce qui a été fait

## 1. Le bouton
- Visible en haut à droite de l'écran sur toutes les pages (icône 🌐 + "AR"/"FR"), et aussi
  dans le menu latéral et sur la page de connexion.
- Le choix est **personnel** : chaque appareil/navigateur garde son propre réglage
  (enregistré dans le navigateur, pas dans la base de données). Deux caissiers sur deux
  postes différents peuvent donc avoir chacun leur langue.
- Quand on passe en arabe, toute la page bascule aussi en RTL (écriture de droite à gauche).

## 2. Les noms de produits (partout)
- Chaque produit peut maintenant avoir un **nom arabe** (`nameAr`), modifiable par l'admin
  dans **Produits → Modifier**.
- Si l'admin ne saisit rien, une **traduction automatique approximative** est utilisée
  (mots de pâtisserie/boulangerie courants traduits ; les noms très spécifiques/régionaux
  restent inchangés plutôt que d'être mal traduits).
- Cette logique est centralisée dans `client/src/i18n/productNames.js`
  (`getProductDisplayName(product, lang)`), donc le même nom s'affiche partout : Caisse,
  Commande, Produits (admin), Préparateur, tickets de caisse.
- Les catégories (Pain, Pâtisserie, Salé...) ont aussi leur libellé arabe.

## 3. Pages entièrement bilingues (FR + AR)
- Connexion, menu/navigation, page **Produits** (admin, avec le champ "Nom arabe"),
  page **Préparateur**, et les écrans principaux de **Caisse** et **Commande**
  (catégories, grille de produits, panier, ticket).

## 4. Pages pas encore traduites
Le texte de l'interface (titres, boutons) des pages suivantes reste en français pour
l'instant : Bilan, Bilan Caisse, Ventes, Achats, Historique, Remboursement, Stock vidé,
Stock, Suivi commandes, Commande Rziza, et certaines fenêtres/popups avancées (Cake
Design, personnalisation gâteau, plateau salé...). L'infrastructure (`useLanguage()`,
`translations.js`) est en place pour les ajouter au même rythme — dites-moi si vous
voulez que je continue sur ces pages.

## 5. Étape technique à faire avant de déployer
La base de données a besoin d'une petite migration pour stocker le nom arabe des
produits ajoutés/modifiés par l'admin :

```
mysql -u <user> -p <database> < database/migration_product_name_ar.sql
```

(à exécuter une seule fois, après `migration_custom_products.sql` si ce n'est pas déjà
fait). Sans cette migration, le serveur renverra une erreur SQL quand l'admin
enregistrera un nom arabe.

## 6. Fichiers ajoutés/modifiés (principaux)
- `client/src/context/LanguageContext.jsx` (nouveau) — état de langue + `t()`
- `client/src/i18n/translations.js` (nouveau) — textes FR/AR
- `client/src/i18n/productNames.js` (nouveau) — traduction des noms de produits
- `client/src/components/Layout.jsx`, `pages/LoginPage.jsx`, `pages/ProduitsPage.jsx`,
  `pages/PreparateurPage.jsx`, `pages/POSPage.jsx`, `pages/CommandesPage.jsx`
- `client/src/data/products.js` — libellés arabes des catégories/ateliers
- `client/src/api/products.js`, `server/routes/products.js` — support du champ `nameAr`
- `database/migration_product_name_ar.sql` (nouveau)
