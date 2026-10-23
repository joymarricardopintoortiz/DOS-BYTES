import { Dialog } from 'quasar'

export function useConfirm() {
  return function confirmAction({
    title = '¿Confirmar acción?',
    message = '',
    okLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    color = 'negative',
    icon = 'warning',
  } = {}) {
    return new Promise((resolve) => {
      let settled = false
      const settle = (value) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      Dialog.create({
        title,
        message,
        icon,
        color,
        persistent: true,
        ok: { label: okLabel, color, unelevated: true },
        cancel: { label: cancelLabel, flat: true },
      })
        .onOk(() => settle(true))
        .onCancel(() => settle(false))
        .onDismiss(() => settle(false))
    })
  }
}
