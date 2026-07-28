
ALTER TABLE `production_entries`
  ADD COLUMN `weight_kg` decimal(10,3) DEFAULT NULL AFTER `price`;
