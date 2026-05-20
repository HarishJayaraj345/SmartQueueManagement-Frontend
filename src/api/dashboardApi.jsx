const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/public'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'API request failed')
  }

  return response.json()
}

export function getClients() {
  return request('/clients')
}

export function getBranchesByClient(clientId) {
  return request(`/clients/${clientId}/branches`)
}

export function getServicesByBranch(branchId) {
  return request(`/branches/${branchId}/services`)
}

export function bookToken(payload) {
  return request('/tokens/book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}
