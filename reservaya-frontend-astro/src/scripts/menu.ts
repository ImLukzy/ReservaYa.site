// src/scripts/menu.ts
// Maneja la apertura/cierre del menu movil
export function setupMenuToggle() {
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (!menuToggle || !mobileMenu) return;

  const setOpen = (open: boolean) => {
    mobileMenu.classList.toggle("hidden", !open);
    menuToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  mobileMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
}

setupMenuToggle();
