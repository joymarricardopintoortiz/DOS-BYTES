import placeholder from '../assets/placeholder.svg'

export function mediaUrl(url) {
  if (!url) return placeholder
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

export { placeholder }
