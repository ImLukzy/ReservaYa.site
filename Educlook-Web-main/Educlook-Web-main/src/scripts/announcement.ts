// src/scripts/announcement.ts
// Maneja el cierre y persistencia del anuncio superior
export function setupAnnouncementBar() {
  const key = "announcement-hidden";
  const bar = document.getElementById("announcement-bar");
  const close = document.getElementById("announcement-close");
  if (localStorage.getItem(key) === "true" && bar) {
    bar.remove();
  }
  if (bar && close) {
    close.addEventListener("click", () => {
      bar.style.display = "none";
      bar.setAttribute("aria-hidden", "true");
      localStorage.setItem(key, "true");
    });
  }
}

setupAnnouncementBar();
