import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { Quasar, Notify, Dialog, Loading } from 'quasar'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './style.css'

import App from './App.vue'
import router from './router'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App)
  .use(pinia)
  .use(router)
  .use(Quasar, {
    plugins: { Notify, Dialog, Loading },
    config: {
      brand: {
        primary: '#0B1F3A',
        secondary: '#00C2FF',
        accent: '#FFC93C',
        dark: '#122033',
        positive: '#16A34A',
        negative: '#DC2626',
        info: '#0284C7',
        warning: '#F59E0B',
      },
      notify: {
        position: 'top',
        timeout: 3800,
        actions: [{ icon: 'close', color: 'white', round: true }],
      },
    },
  })
  .mount('#app')
