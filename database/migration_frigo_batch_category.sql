ALTER TABLE `frigo_batches`
  ADD COLUMN `category` varchar(50) NOT NULL DEFAULT 'gateaux_kg' AFTER `base_product_id`;

UPDATE `frigo_batches` fb
JOIN `production_entries` pe ON pe.id = fb.production_entry_id
SET fb.category = pe.category
WHERE pe.category IN ('entremet', 'gateaux_kg');
