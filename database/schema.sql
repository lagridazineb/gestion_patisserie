-- ============================================================
-- Pâtisserie Dianna - Base de données
-- ============================================================

CREATE DATABASE IF NOT EXISTS diana_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE diana_pos;

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'preparateur', 'caissier') NOT NULL DEFAULT 'preparateur',
  atelier VARCHAR(50) DEFAULT NULL,
  session_token VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT NULL,
  color VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  image VARCHAR(500) DEFAULT NULL,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(20) NOT NULL,
  user_id INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tva DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remise DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'card') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table: production
-- ============================================================
CREATE TABLE IF NOT EXISTS production (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  atelier VARCHAR(50) NOT NULL,
  production_date DATE NOT NULL,
  production_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table: history
-- ============================================================
CREATE TABLE IF NOT EXISTS history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  amount DECIMAL(10, 2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Données initiales
-- ============================================================

INSERT INTO categories (id, label, icon, color) VALUES
('pain', 'Pain', '🌾', '#C9A15F'),
('viennoiserie', 'Viennoiserie', '🥐', '#D4B87A'),
('millefeuille', 'Millefeuille / Cake', '🧁', '#E08A6F'),
('gateau_maroc', 'Gâteau Marocain', '🍪', '#A8833D'),
('entremet', 'Entremets', '🎂', '#C9A15F'),
('patisserie', 'Pâtisserie', '🍰', '#D4B87A'),
('sale', 'Salé', '🥪', '#8B3A2A'),
('rziza', 'Rziza', '🥖', '#A8833D');

-- Mot de passe pour tous les comptes ci-dessous : diana2024
-- (hash bcrypt généré pour ce mot de passe précis - ne pas réutiliser un hash d'un autre projet)
INSERT INTO users (email, password, name, role, atelier) VALUES
('admin@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Administrateur', 'admin', NULL),
('pain@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Pain', 'preparateur', 'pain'),
('viennoiserie@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Viennoiserie', 'preparateur', 'viennoiserie'),
('patisserie@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Pâtisserie', 'preparateur', 'patisserie'),
('sale@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Salé', 'preparateur', 'sale'),
('gateau@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Gâteau', 'preparateur', 'gateau_maroc'),
('entremet@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Entremets', 'preparateur', 'entremet'),
('millefeuille@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Millefeuille / Cake', 'preparateur', 'millefeuille'),
('rziza@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Rziza', 'preparateur', 'rziza'),
('melange@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Préparateur Mélange', 'preparateur', 'melange'),
('caissier1@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Caissier 1', 'caissier', NULL),
('caissier2@diana.ma', '$2a$10$Y87R9jFYgvQtGh.yXjBtj.N/doZ5dXBSAjphq7iBeRgC3jdzGKBQi', 'Caissier 2', 'caissier', NULL);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_production_user ON production(user_id);
CREATE INDEX idx_production_date ON production(production_date);
CREATE INDEX idx_history_user ON history(user_id);
CREATE INDEX idx_history_date ON history(created_at);
