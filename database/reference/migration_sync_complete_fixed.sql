-- Migration : synchronisation complète (stock, production, commandes, ventes,
-- remboursements, achats, fonds de caisse, Rziza, clôtures, sessions de caisse).
-- Version CORRIGÉE : peut être exécutée plusieurs fois sans erreur, même si une
-- partie a déjà été appliquée avant (colonnes/tables déjà existantes = ignorées).

-- --------------------------------------------------------
-- Stock courant (quantité par produit)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_quantities` (
  `product_id` varchar(80) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Compteur de tickets partagé (caisse + commandes)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ticket_counter` (
  `id` tinyint(1) NOT NULL DEFAULT 1,
  `value` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `ticket_counter` (`id`, `value`) VALUES (1, 0) ON DUPLICATE KEY UPDATE id = id;

-- --------------------------------------------------------
-- Production (journal des préparateurs)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `production_entries` (
  `id` bigint(20) NOT NULL,
  `product_id` varchar(80) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `weight_kg` decimal(10,3) DEFAULT NULL,
  `atelier` varchar(50) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `production_time` time DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_prodentries_atelier_date` (`atelier`, `production_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Lots "Frigo Entremet"
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `frigo_batches` (
  `id` varchar(100) NOT NULL,
  `production_entry_id` bigint(20) DEFAULT NULL,
  `base_product_id` varchar(80) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `weight_kg` decimal(10,3) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Réservations / Commandes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` bigint(20) NOT NULL,
  `ticket_number` int(11) NOT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `client_phone` varchar(50) DEFAULT NULL,
  `delivery_date` varchar(20) DEFAULT NULL,
  `delivery_time` varchar(20) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `items` json NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `avance` decimal(10,2) NOT NULL DEFAULT 0,
  `avance_initiale` decimal(10,2) NOT NULL DEFAULT 0,
  `reste_a_payer` decimal(10,2) NOT NULL DEFAULT 0,
  `payment_mode` varchar(20) DEFAULT NULL,
  `ready` tinyint(1) NOT NULL DEFAULT 0,
  `done_by_atelier` json DEFAULT NULL,
  `refunded_qty` json DEFAULT NULL,
  `solde_paid` tinyint(1) NOT NULL DEFAULT 0,
  `solde_payment_mode` varchar(20) DEFAULT NULL,
  `solde_paid_at` datetime DEFAULT NULL,
  `solde_amount` decimal(10,2) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reservations_ticket` (`ticket_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Ventes (journal de caisse)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales` (
  `id` bigint(20) NOT NULL,
  `ticket_number` int(11) NOT NULL,
  `items` json NOT NULL,
  `payment_type` varchar(20) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `refunded_qty` json DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sales_ticket` (`ticket_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Remboursements (ventes + commandes)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refunds` (
  `id` bigint(20) NOT NULL,
  `type` enum('sale','commande') NOT NULL,
  `ticket_number` int(11) NOT NULL,
  `ref_id` bigint(20) DEFAULT NULL,
  `items` json NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Achats (dépenses fournisseurs/ingrédients)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` bigint(20) NOT NULL,
  `purchase_date` date NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Fond de caisse (dépôts manuels)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fonds_caisse` (
  `id` bigint(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Livraisons Rziza (fournisseur externe)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rziza_deliveries` (
  `id` bigint(20) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `prix_achat` decimal(10,2) NOT NULL,
  `prix_vente` decimal(10,2) NOT NULL,
  `montant_du` decimal(10,2) NOT NULL,
  `statut` varchar(20) NOT NULL DEFAULT 'non_paye',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Réglages de clôture
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eod_settings` (
  `id` tinyint(1) NOT NULL DEFAULT 1,
  `clear_time` varchar(5) NOT NULL DEFAULT '22:00',
  `last_cleared_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `eod_settings` (`id`, `clear_time`, `last_cleared_date`) VALUES (1, '22:00', NULL) ON DUPLICATE KEY UPDATE id = id;

-- --------------------------------------------------------
-- Historique des clôtures (vidange de stock)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_clear_log` (
  `id` bigint(20) NOT NULL,
  `type` varchar(20) NOT NULL,
  `entries` json NOT NULL,
  `total_quantity` decimal(10,2) DEFAULT 0,
  `total_value` decimal(10,2) DEFAULT 0,
  `product_count` int(11) DEFAULT 0,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `deleted_products` (
  `product_id` varchar(80) NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS `product_edits` (
  `product_id` varchar(80) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `image` mediumtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=UTF8MB4;

UPDATE users
SET password = '$2b$10$R6B4h/Ub5L1ndcj9Gg1Vf.aPfqvMH3JIJ7.YJQtGWLgp9IXkQZlea'
WHERE email = 'admin@diana.ma';

-- --------------------------------------------------------
-- Colonnes name_ar : ajoutées seulement si elles n'existent pas déjà
-- (évite l'erreur 1060 "Duplicate column name" quand ce script est rejoué)
-- --------------------------------------------------------
SET @db := DATABASE();

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'production_entries' AND COLUMN_NAME = 'weight_kg'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `production_entries` ADD COLUMN `weight_kg` decimal(10,3) DEFAULT NULL AFTER `price`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'custom_products' AND COLUMN_NAME = 'name_ar'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `custom_products` ADD COLUMN `name_ar` varchar(255) DEFAULT NULL AFTER `name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_edits' AND COLUMN_NAME = 'name_ar'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `product_edits` ADD COLUMN `name_ar` varchar(255) DEFAULT NULL AFTER `name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Sessions de caisse (dépôt, heure d'entrée/de sortie, totaux ventes/commandes)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cashier_sessions` (
  `id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `opening_amount` decimal(10,2) NOT NULL DEFAULT 0,
  `opened_at` datetime NOT NULL,
  `closed_at` datetime DEFAULT NULL,
  `closing_sales_total` decimal(10,2) DEFAULT NULL,
  `closing_sales_count` int(11) DEFAULT NULL,
  `closing_commandes_total` decimal(10,2) DEFAULT NULL,
  `closing_commandes_count` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  PRIMARY KEY (`id`),
  KEY `idx_cashier_sessions_user` (`user_id`),
  KEY `idx_cashier_sessions_status` (`status`),
  KEY `idx_cashier_sessions_opened` (`opened_at`)
) ENGINE=InnoDB DEFAULT CHARSET=UTF8MB4;


SELECT * FROM product_edits WHERE name = '' OR name IS NULL;

DELETE FROM product_edits WHERE name = '' OR name IS NULL;
