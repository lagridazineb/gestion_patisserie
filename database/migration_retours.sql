-- Migration : Ajout des tables pour les retours
-- À exécuter sur la base de données MySQL

-- Retours du jour dernier (stock réutilisable du jour précédent)
CREATE TABLE IF NOT EXISTS retours_veille (
  id BIGINT PRIMARY KEY,
  atelier VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  products TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retours de vidage de caisse (fin de nuit)
CREATE TABLE IF NOT EXISTS retours_vidage (
  id BIGINT PRIMARY KEY,
  atelier VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  products TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX idx_retours_veille_date ON retours_veille(date);
CREATE INDEX idx_retours_vidage_date ON retours_vidage(date);
