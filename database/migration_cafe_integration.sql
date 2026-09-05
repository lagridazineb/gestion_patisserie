-- ============================================================
-- Intégration Dianna Café dans Dianna Pâtisserie (Dianna Group)
-- ============================================================
-- Un seul serveur, une seule base, un seul login. La colonne `business` sur `users`
-- indique quel espace l'utilisateur voit après connexion : 'patisserie' (comportement
-- actuel, inchangé) ou 'cafe' (nouvel espace, carte + caisse + bilan simplifiés).
--
-- Les tables du café gardent leur propre schéma (pas de stock, pas de catégories) mais
-- sont préfixées `cafe_` pour ne jamais entrer en collision avec les tables pâtisserie
-- existantes (`products`, `sales`, ...).
--
-- `fonds_caisse` (déjà utilisé par la pâtisserie) est partagée : une colonne `business`
-- sépare les dépôts de fonds de caisse du café de ceux de la pâtisserie, pour que
-- l'admin café ait lui aussi son historique de "Fonds de caisse" façon pâtisserie, en plus
-- de ses dépôts (espèces + reçu) déjà existants dans `cafe_deposits`.

-- --------------------------------------------------------
-- users : ajout de la colonne business
-- --------------------------------------------------------
ALTER TABLE users
  ADD COLUMN business ENUM('patisserie', 'cafe') NOT NULL DEFAULT 'patisserie' AFTER role;

-- --------------------------------------------------------
-- fonds_caisse : ajout de la colonne business (les lignes existantes restent 'patisserie')
-- --------------------------------------------------------
ALTER TABLE fonds_caisse
  ADD COLUMN business ENUM('patisserie', 'cafe') NOT NULL DEFAULT 'patisserie' AFTER amount;

-- --------------------------------------------------------
-- cafe_products : carte du café (gérable depuis l'admin café)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cafe_products` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image` mediumtext DEFAULT NULL,
  `water_option` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `cafe_products` (`id`, `name`, `price`, `image`, `water_option`, `sort_order`) VALUES
  ('cafe_noir', 'Café noir', 10.00, '/images/cafe-noir.jpg', 1, 1),
  ('cafe_creme', 'Café crème', 10.00, '/images/cafe-creme.jpg', 1, 2),
  ('the', 'Thé', 10.00, '/images/the.jpg', 1, 3),
  ('lait_chaud', 'Lait chaud', 9.00, '/images/lait.jpg', 1, 4),
  ('lait_froid', 'Lait froid', 10.00, '/images/lait.jpg', 1, 5),
  ('soda', 'Soda', 10.00, '/images/soda.jpg', 1, 6),
  ('jus_orange', 'Jus orange', 15.00, '/images/jus-orange.jpg', 1, 7),
  ('jus_pomme', 'Jus pomme', 15.00, '/images/jus-pomme.jpg', 1, 8),
  ('jus_banane', 'Jus banane', 15.00, '/images/jus-banane.jpg', 1, 9),
  ('panache', 'Panaché', 20.00, '/images/panache.jpg', 1, 10),
  ('avocat', 'Avocat', 18.00, '/images/avocat.jpg', 1, 11),
  ('eau_seule', 'Eau', 2.00, '/images/eau.jpg', 0, 12)
ON DUPLICATE KEY UPDATE id = id;

-- --------------------------------------------------------
-- cafe_ticket_counter : compteur de tickets, indépendant de la pâtisserie
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cafe_ticket_counter` (
  `id` tinyint(1) NOT NULL DEFAULT 1,
  `value` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `cafe_ticket_counter` (`id`, `value`) VALUES (1, 0) ON DUPLICATE KEY UPDATE id = id;

-- --------------------------------------------------------
-- cafe_sales : journal des ventes du café
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cafe_sales` (
  `id` bigint(20) NOT NULL,
  `ticket_number` int(11) NOT NULL,
  `items` json NOT NULL,
  `payment_type` varchar(20) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cafe_sales_ticket` (`ticket_number`),
  KEY `idx_cafe_sales_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- cafe_deposits : dépôts de caisse (espèces + reçu) avec calendrier — Bilan café
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cafe_deposits` (
  `id` bigint(20) NOT NULL,
  `deposit_date` date NOT NULL,
  `cash_amount` decimal(10,2) NOT NULL DEFAULT 0,
  `receipt_ref` varchar(100) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cafe_deposits_date` (`deposit_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Comptes de départ du café (mot de passe : cafe2024, même hash que l'app d'origine)
-- --------------------------------------------------------
INSERT INTO `users` (`email`, `password`, `name`, `role`, `business`) VALUES
  ('admin@dianacafe.ma', '$2b$10$TGjv0VuOClwfevkskuKAGOEX/Xp9RAQv3Kq37nC4711fIG/5Vgoo6', 'Admin Café', 'admin', 'cafe'),
  ('caissier1@dianacafe.ma', '$2b$10$TGjv0VuOClwfevkskuKAGOEX/Xp9RAQv3Kq37nC4711fIG/5Vgoo6', 'Caissier Café 1', 'caissier', 'cafe')
ON DUPLICATE KEY UPDATE email = email;

-- --------------------------------------------------------
-- Indexes
-- --------------------------------------------------------
CREATE INDEX idx_users_business ON users(business);
CREATE INDEX idx_fonds_caisse_business ON fonds_caisse(business);
