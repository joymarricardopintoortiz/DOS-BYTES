<script setup>
import ProductCard from './ProductCard.vue'

defineProps({
  title: { type: String, required: true },
  kicker: { type: String, default: '' },
  products: { type: Array, default: () => [] },
  link: { type: Object, default: null },
  linkLabel: { type: String, default: 'Ver todo' },
})
</script>

<template>
  <section v-if="products.length" class="section">
    <div class="section-head">
      <div>
        <span v-if="kicker" class="eyebrow">{{ kicker }}</span>
        <h2 class="section-title">{{ title }}</h2>
      </div>
      <router-link v-if="link" class="section-link" :to="link">
        {{ linkLabel }} <q-icon name="arrow_forward" size="16px" />
      </router-link>
    </div>
    <div class="product-grid">
      <ProductCard v-for="product in products" :key="product._id" :product="product" />
    </div>
  </section>
</template>
