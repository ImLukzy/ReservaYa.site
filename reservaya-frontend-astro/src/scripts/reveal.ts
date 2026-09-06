// src/scripts/reveal.ts
// Aparición suave al hacer scroll (stagger con data-reveal-delay en ms).
// Seguro: el estado oculto solo existe con html.js, así nada queda
// invisible si el JS falla. Respeta prefers-reduced-motion.

const MAX_DELAY = 480;

function delayOf(el: Element): number {
  const raw = el.getAttribute('data-reveal-delay');
  if (raw !== null) {
    const ms = parseInt(raw, 10);
    if (!Number.isNaN(ms)) return Math.max(0, Math.min(MAX_DELAY, ms));
  }
  return 0;
}

export function setupRevealOnScroll() {
  const els = Array.from(
    new Set(
      document.querySelectorAll<HTMLElement>(
        '.reveal, main h1, main h2, main h3, main p, main article, main [data-scroll-reveal]'
      )
    )
  );
  if (els.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('reveal-visible'));
    return;
  }

  els.forEach((el) => el.classList.add('scroll-reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealEl(entry.target as HTMLElement, observer);
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -4% 0px' }
  );
  els.forEach((el) => observer.observe(el));

  // El contenido permanece visible; esto sólo añade la animación cuando corresponde.
}

function revealEl(el: HTMLElement, observer?: IntersectionObserver) {
  el.style.setProperty('--reveal-delay', `${delayOf(el)}ms`);
  el.classList.add(el.classList.contains('reveal') ? 'reveal-visible' : 'scroll-reveal-visible');
  observer?.unobserve(el);
}

setupRevealOnScroll();
