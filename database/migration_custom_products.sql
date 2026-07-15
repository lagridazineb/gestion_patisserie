-- Permet à l'admin d'ajouter/modifier des produits depuis la page "Produits", en plus du
-- catalogue de base défini dans le code (client/src/data/products.js). À exécuter en plus de
-- migration_deleted_products.sql (qui gère déjà le masquage des produits de base).

-- Produits ajoutés par l'admin, qui n'existent pas dans le catalogue de base.
-- image est en MEDIUMTEXT pour pouvoir stocker aussi bien une URL qu'une image envoyée
-- depuis l'appareil (encodée en base64, jusqu'à ~16 Mo).
CREATE TABLE IF NOT EXISTS `custom_products` (
  `id` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(50) NOT NULL,
  `image` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Modifications appliquées en surcouche à un produit du catalogue de base (nom/prix/
-- catégorie/image) : le produit d'origine reste dans le code, mais ces valeurs prennent
-- le dessus partout où le catalogue est affiché.
CREATE TABLE IF NOT EXISTS `product_edits` (
  `product_id` varchar(80) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `image` mediumtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
