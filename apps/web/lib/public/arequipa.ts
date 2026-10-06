// Catálogos fijos de la landing. Espejo de la API:
// DistritosArequipa (ComplejosController.cs) y TipoCancha (Models/Enums.cs).

export const DISTRITOS = [
  "Alto Selva Alegre", "Arequipa", "Cayma", "Cerro Colorado", "Characato",
  "Chiguata", "Jacobo Hunter", "José Luis Bustamante y Rivero", "La Joya",
  "Mariano Melgar", "Miraflores", "Mollebaya", "Paucarpata", "Pocsi",
  "Polobaya", "Quequeña", "Sabandía", "Sachaca", "San Juan de Siguas",
  "San Juan de Tarucani", "Santa Isabel de Siguas", "Santa Rita de Siguas",
  "Socabaya", "Tiabaya", "Uchumayo", "Vitor", "Yanahuara", "Yarabamba", "Yura",
] as const;

export const TIPOS = [
  { valor: "FUTBOL", etiqueta: "Fútbol" },
  { valor: "FUTBOL5", etiqueta: "Fútbol 5" },
  { valor: "FUTBOL7", etiqueta: "Fútbol 7" },
  { valor: "VOLLEYBALL", etiqueta: "Vóley" },
  { valor: "BASQUET", etiqueta: "Básquet" },
  { valor: "PADEL", etiqueta: "Pádel" },
  { valor: "TENIS", etiqueta: "Tenis" },
  { valor: "LOZA", etiqueta: "Losa deportiva" },
] as const;

export function etiquetaTipo(valor: string): string {
  return TIPOS.find((t) => t.valor === valor)?.etiqueta ?? valor;
}
