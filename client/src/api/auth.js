import apiClient from './client'

export async function loginApi(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data // { token, user }
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me')
  return data.user
}
