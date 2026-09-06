// src/scripts/theme.ts
// ReservaYa es solo modo claro: fuerza light y limpia restos de dark mode.

document.documentElement.classList.remove('dark');
try {
  localStorage.setItem('theme', 'light');
} catch {
  /* almacenamiento no disponible */
}

export {};
