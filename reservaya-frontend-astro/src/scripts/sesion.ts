// Cabecera: estado de sesión (cookie HttpOnly de la API), menú de cuenta y menú móvil.
import { API } from "../lib/entorno";

interface Usuario {
  nombre?: string;
  email?: string;
}

const porTipo = (tipo: "invitado" | "usuario") => document.querySelectorAll<HTMLElement>(`[data-solo="${tipo}"]`);
const texto = (sel: string, valor: string) => document.querySelectorAll<HTMLElement>(sel).forEach((n) => (n.textContent = valor));

function mostrar(conSesion: boolean) {
  porTipo("invitado").forEach((n) => (n.hidden = conSesion));
  porTipo("usuario").forEach((n) => (n.hidden = !conSesion));
}

function pintar(u: Usuario) {
  const nombre = u.nombre?.trim() || "Mi cuenta";
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join("").toUpperCase();
  texto("[data-iniciales]", iniciales || "?");
  texto("[data-nombre-corto]", nombre.length > 18 ? `${nombre.slice(0, 18)}…` : nombre);
  texto("[data-nombre]", nombre);
  texto("[data-correo]", u.email ?? "");
}

fetch(`${API}/api/auth/me`, { credentials: "include" })
  .then((r) => (r.ok ? r.json() : null))
  .then((body: { usuario?: Usuario } | null) => {
    if (body?.usuario) pintar(body.usuario);
    mostrar(Boolean(body?.usuario));
  })
  .catch(() => mostrar(false));

function desplegable(boton: HTMLElement | null, panel: HTMLElement | null, etiquetas?: [string, string]) {
  if (!boton || !panel) return () => {};
  const poner = (abierto: boolean) => {
    panel.hidden = !abierto;
    boton.setAttribute("aria-expanded", String(abierto));
    if (etiquetas) boton.setAttribute("aria-label", abierto ? etiquetas[1] : etiquetas[0]);
  };
  boton.addEventListener("click", (e) => {
    e.stopPropagation();
    poner(panel.hidden);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      poner(false);
      boton.focus();
    }
  });
  return () => poner(false);
}

const cerrarCuenta = desplegable(document.getElementById("cuenta-boton"), document.getElementById("cuenta-menu"));
desplegable(document.getElementById("menu-boton"), document.getElementById("menu-movil"), ["Abrir menú", "Cerrar menú"]);
document.addEventListener("click", (e) => {
  const menu = document.getElementById("cuenta-menu");
  if (menu && e.target instanceof Node && !menu.contains(e.target)) cerrarCuenta();
});

document.querySelectorAll<HTMLButtonElement>("[data-salir]").forEach((b) =>
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      const res = await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
      if (res.ok) {
        mostrar(false);
        cerrarCuenta();
      }
    } finally {
      b.disabled = false;
    }
  }),
);
