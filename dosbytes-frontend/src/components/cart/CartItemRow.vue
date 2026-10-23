<script setup>
import { computed } from 'vue'
import { useCartStore } from '../../stores/cart'
import { formatCurrency } from '../../utils/format'
import { mediaUrl } from '../../utils/media'

const props = defineProps({
  item: { type: Object, required: true },
})

const cart = useCartStore()
const image = computed(() => mediaUrl(props.item.image))
</script>

<template>
  <div class="cart-line">
    <router-link :to="{ name: 'product', params: { slug: item.slug } }">
      <img :src="image" :alt="item.name" />
    </router-link>

    <div>
      <router-link
        class="cart-line-name"
        :to="{ name: 'product', params: { slug: item.slug } }"
      >
        {{ item.name }}
      </router-link>
      <div class="text-caption text-grey-7">Código: {{ item.code }}</div>
      <div class="text-caption text-grey-7">Precio unitario: {{ formatCurrency(item.price) }}</div>

      <div class="cart-line-actions">
        <q-btn round dense outline icon="remove" aria-label="Quitar una unidad" @click="cart.decrement(item.productId)" />
        <span class="text-weight-bold" style="min-width: 26px; text-align: center">
          {{ item.quantity }}
        </span>
        <q-btn round dense outline icon="add" aria-label="Agregar una unidad" @click="cart.increment(item.productId)" />
        <q-btn
          flat
          dense
          no-caps
          icon="delete"
          label="Quitar"
          color="negative"
          @click="cart.remove(item.productId)"
        />
      </div>
    </div>

    <div class="text-right">
      <div class="text-weight-bold">{{ formatCurrency(item.price * item.quantity) }}</div>
      <div class="text-caption text-grey-7">{{ item.quantity }} × {{ formatCurrency(item.price) }}</div>
    </div>
  </div>
</template>
