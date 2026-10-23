export const SERVICE_LINES = {
  tecnico: { label: 'Servicio técnico', icon: 'build_circle' },
  cibercafe: { label: 'Cibercafé', icon: 'computer' },
  papeleria: { label: 'Papelería', icon: 'edit_note' },
  impresion: { label: 'Impresión y copias', icon: 'print' },
  videojuegos: { label: 'Cibervideojuegos', icon: 'sports_esports' },
  otro: { label: 'Otros servicios', icon: 'apps' },
}

export const SERVICE_LINE_OPTIONS = Object.entries(SERVICE_LINES).map(([value, item]) => ({
  value,
  label: item.label,
}))

export const PRICE_UNITS = {
  servicio: 'por servicio',
  hora: 'por hora',
  pagina: 'por página',
  mes: 'por mes',
  unidad: 'por unidad',
}

export const PRICE_UNIT_OPTIONS = Object.entries(PRICE_UNITS).map(([value, label]) => ({
  value,
  label,
}))

export const EQUIPMENT_TYPES = {
  consola: { label: 'Consola', icon: 'sports_esports' },
  laptop: { label: 'Laptop', icon: 'laptop' },
  pc: { label: 'Computador de escritorio', icon: 'desktop_windows' },
  otro: { label: 'Otro equipo', icon: 'devices_other' },
}

export const EQUIPMENT_TYPE_OPTIONS = Object.entries(EQUIPMENT_TYPES).map(([value, item]) => ({
  value,
  label: item.label,
}))

export const SERVICE_ORDER_STATUS = {
  recibido: { label: 'Recibido', color: 'info', icon: 'inbox' },
  diagnostico: { label: 'En diagnóstico', color: 'primary', icon: 'search' },
  esperando_aprobacion: {
    label: 'Esperando aprobación',
    color: 'warning',
    icon: 'pending_actions',
  },
  en_reparacion: { label: 'En reparación', color: 'secondary', icon: 'handyman' },
  listo: { label: 'Listo para entrega', color: 'positive', icon: 'check_circle' },
  entregado: { label: 'Entregado', color: 'grey-7', icon: 'done_all' },
  no_reparable: { label: 'No reparable', color: 'negative', icon: 'report' },
}

export const SERVICE_ORDER_STATUS_OPTIONS = Object.entries(SERVICE_ORDER_STATUS).map(
  ([value, item]) => ({ value, label: item.label })
)

export const SERVICE_ORDER_TRANSITIONS = {
  recibido: ['diagnostico', 'en_reparacion', 'no_reparable'],
  diagnostico: ['esperando_aprobacion', 'en_reparacion', 'no_reparable'],
  esperando_aprobacion: ['en_reparacion', 'no_reparable'],
  en_reparacion: ['listo', 'no_reparable'],
  listo: ['entregado', 'en_reparacion'],
  entregado: [],
  no_reparable: ['entregado'],
}

export const ORDER_STATUS = {
  reservado: { label: 'Reservado', color: 'warning', icon: 'bookmark_added' },
  listo: { label: 'Listo para recoger', color: 'positive', icon: 'shopping_bag' },
  entregado: { label: 'Entregado', color: 'info', icon: 'done_all' },
  cancelado: { label: 'Cancelado', color: 'grey-7', icon: 'cancel' },
}

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS).map(([value, item]) => ({
  value,
  label: item.label,
}))

export const ORDER_TRANSITIONS = {
  reservado: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
}

export const QUOTE_STATUS = {
  pendiente: { label: 'Pendiente', color: 'warning' },
  aprobada: { label: 'Aprobada', color: 'positive' },
  rechazada: { label: 'Rechazada', color: 'negative' },
}

export const DELETION_REASONS = {
  precio: 'Los precios no me convencen',
  no_uso: 'Ya no uso la cuenta',
  mala_experiencia: 'Tuve una mala experiencia',
  privacidad: 'Motivos de privacidad',
  otro: 'Otro motivo',
}

export const DELETION_REASON_OPTIONS = Object.entries(DELETION_REASONS).map(
  ([value, label]) => ({ value, label })
)

export const ROLES = {
  customer: 'Cliente',
  employee: 'Empleado',
  admin: 'Administrador',
}

export const PRODUCT_SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'rating', label: 'Mejor calificados' },
  { value: 'newest', label: 'Más nuevos' },
]

export const REVIEW_SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'rating_desc', label: 'Mejor calificados' },
  { value: 'rating_asc', label: 'Peor calificados' },
]

export const ACCESSORY_SUGGESTIONS = [
  'Cargador',
  'Cable de poder',
  'Control',
  'Base',
  'Funda',
  'Memoria',
  'Disco',
  'Ninguno',
]

export const PRODUCT_PLACEHOLDER = '/src/assets/placeholder.svg'

export function statusInfo(type, value) {
  if (type === 'order') return ORDER_STATUS[value] || { label: value, color: 'grey' }
  if (type === 'quote') return QUOTE_STATUS[value] || { label: value, color: 'grey' }
  return SERVICE_ORDER_STATUS[value] || { label: value, color: 'grey' }
}
