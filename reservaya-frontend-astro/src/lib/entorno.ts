// URLs de la API y del panel (build-time). Únicos fallbacks a localhost permitidos.
export const API = (import.meta.env.PUBLIC_RESERVAYA_API_URL || "http://localhost:5000").replace(/\/$/, "");
export const APP = (import.meta.env.PUBLIC_RESERVAYA_APP_URL || "http://localhost:3000").replace(/\/$/, "");
