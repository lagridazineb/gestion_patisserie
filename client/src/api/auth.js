import apiClient from './client'

export async function loginApi(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data // { token, user }
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me')
  return data.user
}

// Admin uniquement : liste des comptes (préparateurs, caissiers, admin) pour gérer les codes.
export async function fetchAllUsers() {
  const { data } = await apiClient.get('/auth/users')
  return data.users
}

// Admin uniquement : changer le code (mot de passe) de n'importe quel compte, y compris le sien.
export async function changeUserPassword(userId, newPassword) {
  const { data } = await apiClient.put(`/auth/users/${userId}/password`, { password: newPassword })
  return data
}
