// src/scripts/motion.ts
// Tilt 3D sutil al mover el cursor (solo punteros finos).
// (El reveal por scroll y por palabras vive en el script en línea
// de BaseLayout para ejecución garantizada.)

function setupTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const MAX = 7;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    let raf = 0;
    card.addEventListener('mousemove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

setupTilt();
