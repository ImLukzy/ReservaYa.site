import type { Prisma, PrismaClient } from '@reservaya/db';
import { fail, utc } from '../public/format';
// Lectura pública de reseñas (spec 64): una sola fuente para el resumen de /canchas y del perfil.
export type Orden = 'recientes' | 'mejor' | 'peor';
export type Distribucion = Record<'1' | '2' | '3' | '4' | '5', number>;
const LIMITE_MAX = 20;
const ordenes: Record<Orden, Prisma.ResenaOrderByWithRelationInput[]> = {
  recientes: [{ creadoEn: 'desc' }, { id: 'desc' }],
  mejor: [{ puntuacion: 'desc' }, { creadoEn: 'desc' }, { id: 'desc' }],
  peor: [{ puntuacion: 'asc' }, { creadoEn: 'desc' }, { id: 'desc' }],
};
/** "Ana María Quispe" → "Ana Q."; nunca expone el email aunque el nombre lo sea. */
export function autorCorto(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').split('@')[0].trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'Jugador';
  const mayus = (s: string) => s.charAt(0).toLocaleUpperCase('es-PE') + s.slice(1);
  const nombrePila = mayus(partes[0]);
  return partes.length > 1 ? `${nombrePila} ${partes[partes.length - 1].charAt(0).toLocaleUpperCase('es-PE')}.` : nombrePila;
}
export function orden(v: string | undefined): Orden {
  if (v === undefined || v === '') return 'recientes';
  if (v in ordenes) return v as Orden;
  return fail(400, 'Orden inválido');
}
export function limite(v: string | undefined): number {
  if (v === undefined || v === '') return 10;
  const n = Number(v);
  if (!/^\d+$/.test(v) || n < 1 || n > LIMITE_MAX) fail(400, `limite debe estar entre 1 y ${LIMITE_MAX}`);
  return n;
}
type Db = Pick<PrismaClient, 'resena'>;
/** Promedio redondeado a un decimal (mitad hacia arriba con aritmética entera), total y distribución 1..5. */
export async function resumen(db: Db, complejoId: string) {
  const grupos = await db.resena.groupBy({ by: ['puntuacion'], where: { complejoId }, _count: { _all: true } });
  const distribucion: Distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0, suma = 0;
  for (const g of grupos) {
    const n = g._count._all;
    if (g.puntuacion >= 1 && g.puntuacion <= 5) distribucion[String(g.puntuacion) as keyof Distribucion] += n;
    total += n; suma += g.puntuacion * n;
  }
  return { promedio: total ? Math.round((suma * 10) / total) / 10 : 0, total, distribucion };
}
const autorSelect = { usuarioByUsuarioId: { select: { nombre: true } } } as const;
type ConAutor = Prisma.ResenaGetPayload<{ include: typeof autorSelect }>;
const publica = (r: ConAutor) => ({
  id: r.id, puntuacion: r.puntuacion, comentario: r.comentario, respuestaDueno: r.respuestaDueno,
  creadoEn: utc(r.creadoEn), autor: autorCorto(r.usuarioByUsuarioId?.nombre),
});
/** Página de reseñas por cursor (id de la última recibida); `siguiente` es null al final. */
export async function pagina(db: Db, complejoId: string, o: Orden, n: number, cursor?: string) {
  const filas = await db.resena.findMany({
    where: { complejoId }, include: autorSelect, orderBy: ordenes[o], take: n + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hayMas = filas.length > n, visibles = hayMas ? filas.slice(0, n) : filas;
  return { resenas: visibles.map(publica), siguiente: hayMas ? visibles[visibles.length - 1].id : null };
}
