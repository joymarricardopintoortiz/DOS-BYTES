'use strict';

/**
 * Envíos a nivel nacional con tabla fija de franjas.
 * El costo SIEMPRE se calcula aquí, en el servidor: el total que llega desde
 * el navegador nunca es el que se guarda en la orden.
 */

const ZONES = [
  {
    id: 'centro',
    label: 'Centro del país',
    cost: 8000,
    departments: [
      'Bogotá D.C.',
      'Cundinamarca',
      'Boyacá',
      'Caldas',
      'Risaralda',
      'Quindío',
      'Tolima',
      'Huila',
      'Meta',
    ],
  },
  {
    id: 'andina',
    label: 'Andina y pacífico',
    cost: 12000,
    departments: [
      'Antioquia',
      'Santander',
      'Norte de Santander',
      'Valle del Cauca',
      'Nariño',
      'Cauca',
      'Caquetá',
      'Putumayo',
      'Arauca',
      'Casanare',
      'Vichada',
      'Guaviare',
      'Amazonas',
      'Guainía',
      'Vaupés',
    ],
  },
  {
    id: 'caribe',
    label: 'Caribe y costa',
    cost: 18000,
    departments: [
      'Atlántico',
      'Bolívar',
      'Córdoba',
      'Sucre',
      'Magdalena',
      'Cesar',
      'La Guajira',
      'Chocó',
      'San Andrés y Providencia',
    ],
  },
];

const FREE_SHIPPING_MIN = 150000;

const DEPARTMENTS = ZONES.flatMap((zone) => zone.departments).sort((a, b) =>
  a.localeCompare(b, 'es')
);

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const findZone = (department) => {
  const target = normalize(department);
  if (!target) return null;
  return ZONES.find((zone) => zone.departments.some((item) => normalize(item) === target)) || null;
};

const isValidDepartment = (department) => Boolean(findZone(department));

/**
 * @param {string} department nombre del departamento
 * @param {number} subtotal subtotal de los productos
 * @returns {{cost:number, zone:string, free:boolean, reason:string}}
 */
const quote = (department, subtotal = 0) => {
  const zone = findZone(department);
  if (!zone) {
    return { cost: 0, zone: '', free: false, reason: 'Departamento no reconocido' };
  }
  const free = Number(subtotal) >= FREE_SHIPPING_MIN;
  return {
    cost: free ? 0 : zone.cost,
    zone: zone.label,
    free,
    reason: free ? 'Gratis por compra desde $150.000' : '',
  };
};

module.exports = {
  DEPARTMENTS,
  ZONES,
  FREE_SHIPPING_MIN,
  isValidDepartment,
  findZone,
  quote,
};
