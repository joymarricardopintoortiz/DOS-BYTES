import { onUnmounted, watchEffect } from 'vue'

function setMeta(attribute, key, content) {
  if (typeof document === 'undefined') return
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content || '')
}

function setLink(rel, href) {
  if (typeof document === 'undefined' || !href) return
  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export function useSeo(getOptions) {
  let jsonLdScript = null

  watchEffect(() => {
    if (typeof document === 'undefined') return
    const options = typeof getOptions === 'function' ? getOptions() : getOptions
    if (!options) return

    const title = options.title ? `${options.title} | DOS BYTES` : 'DOS BYTES'
    document.title = title
    setMeta('name', 'description', options.description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', options.description)
    if (options.image) setMeta('property', 'og:image', options.image)
    setMeta('property', 'og:type', options.type || 'website')

    if (options.canonical && typeof window !== 'undefined') {
      setLink('canonical', `${window.location.origin}${options.canonical}`)
    }

    if (jsonLdScript) {
      jsonLdScript.remove()
      jsonLdScript = null
    }
    if (options.jsonLd) {
      jsonLdScript = document.createElement('script')
      jsonLdScript.type = 'application/ld+json'
      jsonLdScript.textContent = JSON.stringify(options.jsonLd)
      document.head.appendChild(jsonLdScript)
    }
  })

  onUnmounted(() => {
    if (jsonLdScript) jsonLdScript.remove()
  })
}
