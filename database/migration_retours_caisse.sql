CREATE TABLE IF NOT EXISTS `retours_caisse` (
  `id` bigint(20) NOT NULL,
  `retour_date` date NOT NULL,
  `total_value` decimal(10,2) NOT NULL DEFAULT 0,
  `entries` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `retour_date_unique` (`retour_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
