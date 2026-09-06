// src/scripts/announcement.ts
// Cierre del anuncio superior con persistencia limitada:
// - Se guarda por mensaje (si cambia la promo, vuelve a mostrarse).
// - Caduca a los 7 días (las promos rotan y deben reaparecer).
// - Nunca rompe si localStorage no está disponible.

export function setupAnnouncementBar() {
  const bar = document.getElementById('announcement-bar');
  const close = document.getElementById('announcement-close');
  if (!bar || !close) return;

  // Migración: la versión anterior guardaba un oculto permanente.
  try {
    if (localStorage.getItem('announcement-hidden') === 'true') {
      localStorage.removeItem('announcement-hidden');
    }
  } catch {
    /* almacenamiento no disponible */
  }

  const id = `announcement-hidden:${hash(bar.textContent || '')}`;
  if (isHidden(id)) {
    bar.remove();
    return;
  }

  close.addEventListener('click', () => {
    bar.style.display = 'none';
    bar.setAttribute('aria-hidden', 'true');
    remember(id);
  });
}

function hash(text: string): string {
  let h = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length; i++) {
    h = (h * 31 + clean.charCodeAt(i)) | 0;
  }
  return String(h);
}

function isHidden(id: string): boolean {
  try {
    const raw = localStorage.getItem(id);
    if (!raw) return false;
    const { t } = JSON.parse(raw) as { t: number };
    // 7 días de vigencia
    if (Date.now() - t > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(id);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function remember(id: string) {
  try {
    localStorage.setItem(id, JSON.stringify({ t: Date.now() }));
  } catch {
    /* almacenamiento no disponible */
  }
}

setupAnnouncementBar();
