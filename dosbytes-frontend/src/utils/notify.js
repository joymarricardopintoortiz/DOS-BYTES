import { Notify } from 'quasar'

export function notifySuccess(message) {
  if (!message) return
  Notify.create({ type: 'positive', message, icon: 'check_circle' })
}

export function notifyInfo(message) {
  if (!message) return
  Notify.create({ type: 'info', message, icon: 'info' })
}

export function notifyError(error, fallback = 'Ocurrió un error inesperado') {
  const message = error?.message || fallback
  const details = Array.isArray(error?.errors)
    ? error.errors.map((item) => item.message).filter(Boolean)
    : []
  const text = details.length && details[0] !== message ? `${message}: ${details[0]}` : message
  Notify.create({ type: 'negative', message: text, icon: 'error', timeout: 5000 })
}
