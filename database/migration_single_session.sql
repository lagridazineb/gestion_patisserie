-- Permet de forcer la déconnexion automatique d'un appareil quand le même compte se
-- reconnecte ailleurs (caissier1, caissier2, admin...). À exécuter une seule fois sur une
-- base existante (schema.sql inclut déjà la colonne pour une nouvelle installation).
ALTER TABLE users ADD COLUMN session_token VARCHAR(64) DEFAULT NULL;
