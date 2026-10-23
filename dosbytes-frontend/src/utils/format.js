const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('es-CO')

export function formatCurrency(value) {
  const number = Number(value)
  return currencyFormatter.format(Number.isFinite(number) ? number : 0)
}

export function formatNumber(value) {
  const number = Number(value)
  return numberFormatter.format(Number.isFinite(number) ? number : 0)
}

export function formatDate(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date)
}

export function formatDateTime(value) {
  return formatDate(value, true)
}

export function formatDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function percent(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : 0
}

export function productImage(product) {
  if (!product) return ''
  if (product.mainImage) return product.mainImage
  if (Array.isArray(product.images) && product.images.length) return product.images[0].url
  return ''
}

export function discountPercent(product) {
  if (!product) return 0
  if (Number(product.discountPercent) > 0) return Number(product.discountPercent)
  const price = Number(product.price)
  const compare = Number(product.compareAtPrice)
  if (!compare || compare <= price) return 0
  return Math.round(((compare - price) / compare) * 100)
}
