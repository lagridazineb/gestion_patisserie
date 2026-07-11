-- Migration : synchronisation complète (stock, production, commandes, ventes,
-- remboursements, achats, fonds de caisse, Rziza, clôtures). À exécuter sur la
-- base Aiven APRÈS diana_pos_aiven.sql (qui crée déjà categories/users/products/
-- orders/order_items/production/history).
-- Compatible sql_require_primary_key (toutes les tables ont leur PK dès la création).

-- --------------------------------------------------------
-- Stock courant (quantité par produit) — remplace le localStorage 'diana_stock_v1'
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
-- Production (journal des préparateurs) — remplace 'diana_production_log_v1'
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `production_entries` (
  `id` bigint(20) NOT NULL,
  `product_id` varchar(80) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `atelier` varchar(50) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `production_time` time DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_prodentries_atelier_date` (`atelier`, `production_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Lots "Frigo Entremet" (gâteaux au kg vendus en pièces uniques) — 'diana_frigo_batches_v1'
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
-- Réservations / Commandes — remplace 'diana_reservations_v1'
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
-- Ventes (journal de caisse) — remplace 'diana_sales_log_v1'
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
-- Remboursements (ventes + commandes) — remplace 'diana_refunds_log_v1'
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
-- Achats (dépenses fournisseurs/ingrédients) — remplace 'diana_purchases_v1'
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
-- Fond de caisse (dépôts manuels) — remplace 'diana_fonds_caisse_v1'
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fonds_caisse` (
  `id` bigint(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Livraisons Rziza (fournisseur externe) — remplace 'diana_rziza_deliveries_v1'
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
-- Réglages de clôture (heure de clôture auto + dernière date) — 'diana_eod_settings_v1'
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eod_settings` (
  `id` tinyint(1) NOT NULL DEFAULT 1,
  `clear_time` varchar(5) NOT NULL DEFAULT '22:00',
  `last_cleared_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `eod_settings` (`id`, `clear_time`, `last_cleared_date`) VALUES (1, '22:00', NULL) ON DUPLICATE KEY UPDATE id = id;

-- --------------------------------------------------------
-- Historique des clôtures (vidange de stock) — 'diana_stock_clear_log_v1'
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
