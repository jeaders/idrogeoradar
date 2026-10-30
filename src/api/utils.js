const isDev = import.meta.env.DEV;
const origin = typeof window !== 'undefined' ? window.location.origin : '';
export const apiBase = isDev ? '' : '/api';
export const absoluteBase = origin + apiBase;