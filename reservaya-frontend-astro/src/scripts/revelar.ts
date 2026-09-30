// Revela un bloque al entrar en pantalla, una sola vez (Reveal de Universo, spec 50).
// Solo cambia opacity y transform (CLS 0); el CSS vive en styles/motion.css.
const bloques = document.querySelectorAll<HTMLElement>(".revelar");

if (!("IntersectionObserver" in window)) {
  bloques.forEach((b) => b.classList.add("visible"));
} else {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("visible");
        observador.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -80px 0px" },
  );
  bloques.forEach((b) => observador.observe(b));
}
