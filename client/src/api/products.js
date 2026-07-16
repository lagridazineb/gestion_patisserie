import apiClient from './client'

// Récupère la "surcouche" appliquée au catalogue de base (products.js) : produits ajoutés,
// modifications, et masquages. À combiner avec ALL_PRODUCTS via mergeProductOverlay().
export async function getProductOverlay() {
  const { data } = await apiClient.get('/products')
  return data
}

export async function createProduct({ name, nameAr, price, category, image }) {
  const { data } = await apiClient.post('/products', { name, nameAr, price, category, image })
  return data.product
}

export async function updateProduct(id, { name, nameAr, price, category, image }) {
  const { data } = await apiClient.put(`/products/${id}`, { name, nameAr, price, category, image })
  return data.product
}

export async function deleteProduct(id) {
  await apiClient.delete(`/products/${id}`)
  return { success: true }
}

export async function restoreProduct(id) {
  await apiClient.post(`/products/${id}/restore`)
  return { success: true }
}
