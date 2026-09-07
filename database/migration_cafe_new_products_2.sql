-- Ajustement carte café : le prix de "Eau" (créé à 2.00 DH par erreur lors de la première
-- migration) passe à 10.00 DH, et 3 nouveaux produits sont ajoutés à la carte.
UPDATE `cafe_products` SET `price` = 10.00, `image` = '/images/eau-bouteille.jpg' WHERE `id` = 'eau_seule';

INSERT INTO `cafe_products` (`id`, `name`, `price`, `image`, `water_option`, `sort_order`) VALUES
  ('lipton_lait', 'Lipton au lait', 10.00, '/images/lipton.jpg', 1, 14),
  ('lipton_eau', "Lipton à l'eau", 10.00, '/images/lipton.jpg', 1, 15),
  ('louiza', 'Louiza', 10.00, '/images/louiza.jpg', 1, 16)
ON DUPLICATE KEY UPDATE price = VALUES(price), image = VALUES(image);
