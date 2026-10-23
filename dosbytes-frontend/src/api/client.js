const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

let authToken = null

export function setAuthToken(token) {
  authToken = token || null
}

export class ApiError extends Error {
  constructor(message, status = 0, errors = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = Array.isArray(errors) ? errors : []
  }
}

function buildUrl(path, query) {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') params.append(key, item)
      })
      return
    }
    params.append(key, value)
  })
  const serialized = params.toString()
  return serialized ? `${url}?${serialized}` : url
}

function dispatch(name, detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { ok: response.ok, message: text }
  }
}

export async function request(path, { method = 'GET', body, query, headers = {}, signal } = {}) {
  const url = buildUrl(path, query)
  const options = {
    method,
    headers: { Accept: 'application/json', ...headers },
    signal,
  }

  if (authToken) options.headers.Authorization = `Bearer ${authToken}`

  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      options.body = body
    } else {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }
  }

  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0)
  }

  const payload = await parseResponse(response)

  if (!response.ok) {
    const errors = Array.isArray(payload?.errors) ? payload.errors : []
    const message =
      payload?.message ||
      (response.status === 429
        ? 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'
        : 'No se pudo completar la solicitud')
    const apiError = new ApiError(message, response.status, errors)

    if (response.status === 401 && authToken) {
      dispatch('db:unauthorized', { status: 401 })
    }

    if (
      response.status === 403 &&
      (errors.some((item) => item.code === 'PASSWORD_CHANGE_REQUIRED') ||
        /contraseña temporal/i.test(message))
    ) {
      dispatch('db:password-change-required', {})
    }

    throw apiError
  }

  return payload
}

const postJson = (path, body) => request(path, { method: 'POST', body })
const patchJson = (path, body) => request(path, { method: 'PATCH', body })
const deleteJson = (path, body) => request(path, { method: 'DELETE', body })

export const authApi = {
  register: (body) => postJson('/auth/register', body),
  verify: (token) => request(`/auth/verify/${encodeURIComponent(token)}`),
  resendVerification: (body) => postJson('/auth/resend-verification', body),
  login: (body) => postJson('/auth/login', body),
  me: () => request('/auth/me'),
  logout: () => postJson('/auth/logout'),
  changePassword: (body) => patchJson('/auth/change-password', body),
  forgotPassword: (body) => postJson('/auth/forgot-password', body),
  resetPassword: (token, body) =>
    request(`/auth/reset-password/${encodeURIComponent(token)}`, { method: 'POST', body }),
}

export const homeApi = {
  get: () => request('/home'),
}

export const configApi = {
  get: () => request('/config'),
  update: (body) => patchJson('/config', body),
}

export const categoriesApi = {
  list: (query) => request('/categories', { query }),
  get: (slug) => request(`/categories/${encodeURIComponent(slug)}`),
  create: (body) => postJson('/categories', body),
  update: (id, body) => patchJson(`/categories/${id}`, body),
  remove: (id) => deleteJson(`/categories/${id}`),
}

export const productsApi = {
  list: (query) => request('/products', { query }),
  suggestions: (query) => request('/products/suggestions', { query }),
  get: (slug) => request(`/products/${encodeURIComponent(slug)}`),
  byCode: (code) => request(`/products/code/${encodeURIComponent(code)}`),
  related: (slug) => request(`/products/${encodeURIComponent(slug)}/related`),
  reviews: (slug, query) =>
    request(`/products/${encodeURIComponent(slug)}/reviews`, { query }),
  questions: (slug, query) =>
    request(`/products/${encodeURIComponent(slug)}/questions`, { query }),
  createReview: (slug, body) =>
    postJson(`/products/${encodeURIComponent(slug)}/reviews`, body),
  createQuestion: (slug, body) =>
    postJson(`/products/${encodeURIComponent(slug)}/questions`, body),
  lowStock: () => request('/products/low-stock/list'),
  create: (body) => postJson('/products', body),
  update: (id, body) => patchJson(`/products/${id}`, body),
  updateStock: (id, body) => request(`/products/${id}/stock`, { method: 'PATCH', body }),
  remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  addImages(id, files) {
    const form = new FormData()
    Array.from(files || []).forEach((file) => form.append('images', file))
    return request(`/products/${id}/images`, { method: 'POST', body: form })
  },
  reorderImages(id, images) {
    return request(`/products/${id}/images/order`, {
      method: 'PATCH',
      body: { images },
    })
  },
  setMainImage(id, publicId) {
    return request(`/products/${id}/images/main`, {
      method: 'PATCH',
      body: { publicId },
    })
  },
  removeImage(id, publicId) {
    return request(`/products/${id}/images`, {
      method: 'DELETE',
      body: { publicId },
    })
  },
}

export const servicesApi = {
  list: (query) => request('/services', { query }),
  get: (slug) => request(`/services/${encodeURIComponent(slug)}`),
  create: (body) => postJson('/services', body),
  update: (id, body) => patchJson(`/services/${id}`, body),
  remove: (id) => request(`/services/${id}`, { method: 'DELETE' }),
}

export const serviceOrdersApi = {
  create: (body) => postJson('/service-orders', body),
  track: (code) => request(`/service-orders/track/${encodeURIComponent(code)}`),
  quoteDecision: (code, body) =>
    request(`/service-orders/track/${encodeURIComponent(code)}/quote`, {
      method: 'POST',
      body,
    }),
  mine: (query) => request('/service-orders/me', { query }),
  list: (query) => request('/service-orders', { query }),
  createLocal: (body) => postJson('/service-orders/local', body),
  get: (id) => request(`/service-orders/${id}`),
  update: (id, body) => patchJson(`/service-orders/${id}`, body),
  changeStatus: (id, body) =>
    request(`/service-orders/${id}/status`, { method: 'PATCH', body }),
  history: (query) => request('/service-orders/history', { query }),
}

export const ordersApi = {
  create: (body) => postJson('/orders', body),
  mine: (query) => request('/orders/me', { query }),
  list: (query) => request('/orders', { query }),
  getByCode: (code) => request(`/orders/${encodeURIComponent(code)}`),
  cancel: (code, body) => request(`/orders/${encodeURIComponent(code)}/cancel`, {
    method: 'PATCH',
    body,
  }),
  changeStatus: (id, body) => request(`/orders/${id}/status`, { method: 'PATCH', body }),
}

export const reviewsApi = {
  listAll: (query) => request('/reviews', { query }),
  update: (id, body) => request(`/reviews/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  setVisibility: (id, visible) =>
    request(`/reviews/${id}/visibility`, { method: 'PATCH', body: { visible } }),
}

export const questionsApi = {
  answer: (id, answer) =>
    request(`/questions/${id}/answer`, { method: 'PATCH', body: { answer } }),
  setVisibility: (id, visible) =>
    request(`/questions/${id}/visibility`, { method: 'PATCH', body: { visible } }),
  remove: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
}

export const favoritesApi = {
  list: () => request('/favorites'),
  add: (productId) => request('/favorites', { method: 'POST', body: { productId } }),
  remove: (productId) => request(`/favorites/${productId}`, { method: 'DELETE' }),
}

export const usersApi = {
  updateMe: (body) => patchJson('/users/me', body),
  deleteMe: (body) => deleteJson('/users/me', body),
  myFavorites: () => request('/users/me/favorites'),
  myReviews: (query) => request('/users/me/reviews', { query }),
  myQuestions: (query) => request('/users/me/questions', { query }),
  list: (query) => request('/users', { query }),
  createEmployee: (body) => postJson('/users/employees', body),
  update: (id, body) => request(`/users/${id}`, { method: 'PATCH', body }),
  deletionStats: () => request('/users/deletion-stats'),
}

export const statsApi = {
  get: () => request('/stats'),
}

export const uploadsApi = {
  upload(file) {
    const form = new FormData()
    form.append('image', file)
    return request('/uploads', { method: 'POST', body: form })
  },
  remove: (publicId) =>
    request('/uploads', { method: 'DELETE', body: { publicId } }),
}
