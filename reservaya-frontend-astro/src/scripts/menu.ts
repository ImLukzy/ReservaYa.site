// Menús desplegables (Jugar, Dueños) y panel móvil: teclado, mouse, Escape, hover (desktop).

document.addEventListener("DOMContentLoaded", () => {
  const menuBotones = document.querySelectorAll<HTMLButtonElement>(
    "[data-menu-desplegable]"
  );
  const menuPanel = document.getElementById("menu-movil-principal");
  const menuBotonMovil =
    document.getElementById("menu-boton-movil") as HTMLButtonElement | null;
  let menuAbierto: HTMLElement | null = null;

  // Desplegar/ocultar menú
  function toggle(panel: HTMLElement, boton: HTMLButtonElement) {
    if (menuAbierto && menuAbierto !== panel) {
      menuAbierto.hidden = true;
      const otroBoton = menuAbierto.previousElementSibling as HTMLButtonElement;
      if (otroBoton) otroBoton.setAttribute("aria-expanded", "false");
      menuAbierto = null;
    }

    const now = panel.hidden;
    panel.hidden = !now;
    boton.setAttribute("aria-expanded", now.toString());
    if (now) menuAbierto = panel;
    else menuAbierto = null;
  }

  // Clics en botones de menú
  menuBotones.forEach((boton) => {
    const panelId = boton.getAttribute("aria-controls");
    if (!panelId) return;
    const panel = document.getElementById(panelId);
    if (!panel) return;

    boton.addEventListener("click", () => toggle(panel, boton));

    // Hover desktop (sin reducedMotion)
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      boton.addEventListener("mouseenter", () => {
        if (panel.hidden) toggle(panel, boton);
      });
      panel.addEventListener("mouseleave", () => {
        if (!panel.hidden) toggle(panel, boton);
      });
    }

    // Teclado: Enter/Espacio abre, Escape cierra
    boton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(panel, boton);
      }
      if (e.key === "Escape" && !panel.hidden) {
        e.preventDefault();
        toggle(panel, boton);
        boton.focus();
      }
    });
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) {
        toggle(panel, boton);
        boton.focus();
      }
    });

    // Clic fuera cierra
    document.addEventListener("click", (e) => {
      if (
        !panel.hidden &&
        !panel.contains(e.target as Node) &&
        !boton.contains(e.target as Node)
      ) {
        toggle(panel, boton);
      }
    });

    // Opción seleccionada cierra
    panel.querySelectorAll("a").forEach((enlace) => {
      enlace.addEventListener("click", () => {
        if (!panel.hidden) toggle(panel, boton);
      });
    });
  });

  // Panel móvil
  if (menuBotonMovil && menuPanel) {
    menuBotonMovil.addEventListener("click", () => {
      const now = menuPanel.hidden;
      menuPanel.hidden = !now;
      menuBotonMovil.setAttribute("aria-expanded", now.toString());
      document.body.style.overflow = now ? "hidden" : "";
    });

    // Escape cierra panel móvil
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menuPanel.hidden) {
        menuPanel.hidden = true;
        menuBotonMovil.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        menuBotonMovil.focus();
      }
    });

    // Clic en enlace del panel cierra
    menuPanel.querySelectorAll("a").forEach((enlace) => {
      enlace.addEventListener("click", () => {
        menuPanel.hidden = true;
        menuBotonMovil.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }
});
