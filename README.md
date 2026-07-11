# 🥐 Pâtisserie Dianna - Système de Gestion

Système complet de gestion de boulangerie/pâtisserie avec caisse (POS), gestion de stock, tableau de bord, et interface préparateurs.

## 🚀 Démarrage rapide

```bash
# Installer toutes les dépendances
npm run install:all

# Lancer le client et le serveur simultanément
npm run dev
```

Ou séparément :

```bash
# Terminal 1 - Serveur
cd server
npm install
npm run dev

# Terminal 2 - Client
cd client
npm install
npm run dev
```

## 📁 Structure du projet

```
Diana/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   ├── context/        # Contextes React (Auth, Cart, Notifications)
│   │   ├── data/           # Données des produits
│   │   ├── App.jsx         # Router principal
│   │   └── main.jsx        # Point d'entrée
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend Node.js + Express
│   ├── routes/             # Routes API
│   ├── middleware/         # Middleware (auth)
│   ├── server.js           # Point d'entrée serveur
│   └── package.json
├── database/
│   └── schema.sql          # Schéma MySQL
└── package.json            # Configuration monorepo
```

## 🔑 Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@diana.ma | diana2024 | Administrateur |
| pain@diana.ma | diana2024 | Préparateur Pain |
| viennoiserie@diana.ma | diana2024 | Préparateur Viennoiserie |
| patisserie@diana.ma | diana2024 | Préparateur Pâtisserie |
| sale@diana.ma | diana2024 | Préparateur Salé |
| gateau@diana.ma | diana2024 | Préparateur Gâteau Marocain |
| entremet@diana.ma | diana2024 | Préparateur Entremets |
| millefeuille@diana.ma | diana2024 | Préparateur Millefeuille / Cake |
| rziza@diana.ma | diana2024 | Préparateur Rziza |

## 🎨 Design

- **Couleurs**: Beige doré `#D4A373` en fond principal, texte brun foncé pour le contraste
- **Police**: Fraunces (titres) + Inter (corps)
- **Animations**: Framer Motion
- **Responsive**: Mobile et desktop (layout caisse en colonne sur mobile, grilles produits adaptatives, tableaux remplacés par des cartes sur petit écran)
- **Catégories illustrées**: chaque catégorie de la caisse affiche une vraie photo (au lieu d'une icône) dans la grille "Choisissez une catégorie"

## 📦 Fonctionnalités

### Caisse (POS) — page d'accueil, accessible sans connexion
- Catégories de produits avec vraies photos (Pain, Viennoiserie, Millefeuille/Cake, Gâteau Marocain, Entremets, Pâtisserie, Salé, Rziza)
- Chaque produit affiche son stock actuel directement sur sa carte
- Recherche instantanée
- Panier avec quantités
- Aucune TVA appliquée — calcul simple (sous-total − remise)
- Paiement Cash / TPE — débite automatiquement le stock partagé
- Impression de reçu
- Un bouton "Connexion" en haut de l'écran permet à l'Admin ou à un Préparateur de se connecter à tout moment

### Administration
- Tableau de bord avec graphiques
- Gestion des stocks en temps réel, synchronisée avec les productions des préparateurs et les ventes de la caisse
- Vue **"Par préparateur"** : pour chaque atelier (8 préparateurs), le total produit, le total vendu et le chiffre d'affaires généré
- Vue "Détail production" listant chaque saisie individuelle (qui, quoi, combien, quand)
- Gestion des produits (CRUD)
- Historique des actions
- Rapport des ventes

### Préparateurs (page dédiée, par atelier uniquement) — 8 comptes
- Connexion par atelier — chaque préparateur ne voit que les produits de son métier (pain, viennoiserie, pâtisserie, salé, gâteau marocain, entremets, millefeuille/cake, rziza)
- Stock actuel affiché pour chaque produit de l'atelier
- Saisie de production (produit, quantité, date, heure) qui crédite automatiquement le stock partagé et s'affiche immédiatement côté caisse et admin
- Historique personnel de production

> ℹ️ Tous les stocks démarrent à **0**. Le stock est partagé entre la Caisse, les Préparateurs et l'Admin via le stockage du navigateur (`localStorage`). Une production déclarée par un préparateur ou une vente en caisse met à jour le stock visible côté Admin instantanément, dans le même navigateur.

## 🛠 Technologies

**Frontend:**
- React 18 + Vite
- React Router DOM
- Tailwind CSS
- Framer Motion
- React Icons
- Recharts

**Backend:**
- Node.js
- Express.js
- JWT + bcrypt
- MySQL2

## 📝 License

Propriétaire - Pâtisserie Dianna
