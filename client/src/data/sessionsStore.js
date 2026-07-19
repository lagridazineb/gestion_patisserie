import apiClient from '../api/client'

// Ouvre une session de caisse au login (dépôt d'ouverture — obligatoire pour les caissiers,
// 0 par défaut pour les autres rôles).
export async function openSession(openingAmount = 0) {
  const { data } = await apiClient.post('/sessions/open', { openingAmount })
  return data.session
}

// Déconnexion : vérifie le code (mot de passe) puis clôture la session en cours.
// Lève une erreur si le code est incorrect (à afficher dans le modal de confirmation).
export async function closeSession(password) {
  const { data } = await apiClient.post('/sessions/close', { password })
  return data.session
}

// "Vider la caisse" : vérifie le code puis renvoie le détail complet (ventes + commandes)
// de la session clôturée, pour imprimer le reçu.
export async function viderCaisse(password) {
  const { data } = await apiClient.post('/sessions/vider', { password })
  return data
}

// Historique des sessions (connexions/déconnexions) — admin uniquement, page Utilisateurs.
export async function getSessionsHistory() {
  const { data } = await apiClient.get('/sessions/history')
  return data.sessions
}
