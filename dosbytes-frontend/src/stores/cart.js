import { defineStore } from 'pinia'
import { productImage } from '../utils/format'

const MAX_QUANTITY = 99

function normalizeQuantity(value, stock) {
  const stockLimit = Number(stock) > 0 ? Number(stock) : 0
  const quantity = Math.floor(Number(value) || 1)
  const upper = stockLimit ? Math.min(MAX_QUANTITY, stockLimit) : MAX_QUANTITY
  return Math.max(1, Math.min(quantity, upper))
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
  }),

  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: (state) =>
      state.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    isEmpty: (state) => state.items.length === 0,
  },

  actions: {
    add(product, quantity = 1) {
      if (!product || Number(product.stock) <= 0) return false
      const id = String(product._id || product.id)
      const existing = this.items.find((item) => item.productId === id)
      const image = productImage(product)

      if (existing) {
        existing.quantity = normalizeQuantity(existing.quantity + quantity, product.stock)
        existing.stock = Number(product.stock)
        existing.price = Number(product.price)
        return true
      }

      this.items.push({
        productId: id,
        slug: product.slug,
        code: product.code,
        name: product.name,
        price: Number(product.price),
        image,
        stock: Number(product.stock),
        quantity: normalizeQuantity(quantity, product.stock),
      })
      return true
    },

    setQuantity(productId, quantity) {
      const item = this.items.find((entry) => entry.productId === String(productId))
      if (!item) return
      item.quantity = normalizeQuantity(quantity, item.stock)
    },

    increment(productId) {
      const item = this.items.find((entry) => entry.productId === String(productId))
      if (item) item.quantity = normalizeQuantity(item.quantity + 1, item.stock)
    },

    decrement(productId) {
      const item = this.items.find((entry) => entry.productId === String(productId))
      if (item) item.quantity = normalizeQuantity(item.quantity - 1, item.stock)
    },

    remove(productId) {
      this.items = this.items.filter((item) => item.productId !== String(productId))
    },

    clear() {
      this.items = []
    },
  },

  persist: true,
})
