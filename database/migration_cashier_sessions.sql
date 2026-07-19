-- Suivi des sessions de caisse : dépôt d'ouverture, heure d'entrée / de sortie de chaque
-- caissier (et admin), et totaux de ventes/commandes à la clôture (déconnexion ou "Vider
-- la caisse"). Permet à l'admin de voir, par utilisateur, quand il a commencé, quand il
-- s'est déconnecté, et ce qu'il a fait entre les deux.
CREATE TABLE IF NOT EXISTS cashier_sessions (
  id BIGINT PRIMARY KEY,
  user_id INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME DEFAULT NULL,
  closing_sales_total DECIMAL(10,2) DEFAULT NULL,
  closing_sales_count INT DEFAULT NULL,
  closing_commandes_total DECIMAL(10,2) DEFAULT NULL,
  closing_commandes_count INT DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  INDEX idx_cashier_sessions_user (user_id),
  INDEX idx_cashier_sessions_status (status),
  INDEX idx_cashier_sessions_opened (opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
