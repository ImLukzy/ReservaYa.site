// src/scripts/theme.ts
// Maneja el cambio de tema (oscuro/claro) y persistencia en localStorage

// Aplica el tema automaticamente al cargar
const themeToggle = document.getElementById("theme-toggle");
type Theme = "light" | "dark";

const updateThemeIcon = (theme: Theme) => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  const moon = toggle.querySelector('[data-icon="moon"]');
  const sun = toggle.querySelector('[data-icon="sun"]');
  if (!moon || !sun) return;
  const isDark = theme === "dark";
  moon.classList.toggle("hidden", isDark);
  sun.classList.toggle("hidden", !isDark);
  toggle.setAttribute("aria-pressed", String(isDark));
};

const setTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  updateThemeIcon(theme);
};
const storedTheme = localStorage.getItem("theme") as Theme | null;
if (storedTheme) {
  setTheme(storedTheme);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  setTheme("dark");
} else {
  setTheme("light");
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    const newTheme: Theme = isDark ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  });
}

export {};
