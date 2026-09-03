type Theme = "light" | "dark";

if (typeof window !== "undefined") {
  // Mobile menu
  const toggle = document.getElementById("mobile-toggle");
  const menu = document.getElementById("mobile-menu");

  toggle?.addEventListener("click", () => {
    menu?.classList.toggle("hidden");
  });

  // Dark mode
  const themeToggle = document.getElementById("theme-toggle");

  const setTheme = (theme: Theme) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const storedTheme = localStorage.getItem("theme") as Theme | null;

  if (storedTheme) {
    setTheme(storedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    setTheme("dark");
  }

  themeToggle?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    const newTheme: Theme = isDark ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  });


  // Reveal on scroll
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

export {};
