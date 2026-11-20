-- Index de performance : à exécuter UNE SEULE FOIS sur la base MySQL (via le tableau de bord
-- de l'hébergeur ou un client MySQL).
--
-- Pourquoi : `sales` et `reservations` n'avaient AUCUN index sur created_at / created_by. Chaque
-- requête "ventes du jour" ou "ventes de ce caissier" relisait donc la table ENTIÈRE (avec tous
-- ses champs JSON lourds) : de plus en plus lent à mesure que les mois s'accumulent. Avec ces
-- index, MySQL va directement aux lignes concernées : la lenteur ne dépend plus de l'âge des données.
--
-- Si un index existe déjà, MySQL répond "Duplicate key name" : sans gravité, passez au suivant.

CREATE INDEX idx_sales_created_at ON sales (created_at);
CREATE INDEX idx_sales_user_date ON sales (created_by, created_at);

CREATE INDEX idx_reservations_created_at ON reservations (created_at);
CREATE INDEX idx_reservations_user_date ON reservations (created_by, created_at);

CREATE INDEX idx_production_entries_date ON production_entries (production_date);
