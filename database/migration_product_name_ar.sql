-- Ajoute le nom arabe (optionnel, saisi/édité par l'admin depuis la page "Produits") des
-- produits ajoutés et des produits du catalogue de base modifiés. Si vide, le client utilise
-- une traduction automatique approximative (voir client/src/i18n/productNames.js).
-- À exécuter après migration_custom_products.sql.

ALTER TABLE `custom_products`
  ADD COLUMN `name_ar` varchar(255) DEFAULT NULL AFTER `name`;

ALTER TABLE `product_edits`
  ADD COLUMN `name_ar` varchar(255) DEFAULT NULL AFTER `name`;
