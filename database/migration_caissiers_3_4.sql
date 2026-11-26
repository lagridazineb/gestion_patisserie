-- Caissiers 3 et 4 : accès limité par catégories dans la page de vente (caisse).
--   Caissier 1 et 2 : inchangés (toutes les catégories).
--   Caissier 3      : uniquement la catégorie « Pain ».
--   Caissier 4      : toutes les catégories SAUF « Pain ».
--
-- À exécuter UNE SEULE FOIS sur la base MySQL, AVANT de déployer le nouveau code.
-- (Si la colonne pos_scope existe déjà, MySQL répond "Duplicate column name" : passez à la suite.)

ALTER TABLE users ADD COLUMN pos_scope VARCHAR(20) DEFAULT NULL AFTER atelier;

INSERT INTO users (email, password, name, role, business, pos_scope) VALUES
  ('caissier3@diana.ma', '$2b$10$uNmxtYYrRZiXoB6WZlAWne5wmToK75xsdWNQcxRdtdE18IWpkKUpO', 'Caissier 3 (Pain)',            'caissier', 'patisserie', 'pain'),
  ('caissier4@diana.ma', '$2b$10$At4nxZjD9dPDKKEq.22/0.ijjxT/TIPqQDXMOxjPwg7XU5ZjgcbXm', 'Caissier 4 (sans Pain)',       'caissier', 'patisserie', 'sans_pain')
ON DUPLICATE KEY UPDATE name = VALUES(name), pos_scope = VALUES(pos_scope);

-- Les codes de départ sont dans le message du chat. Changez-les ensuite depuis
-- Admin → Utilisateurs → « Changer le code ».
