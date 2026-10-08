import { agendaFranjas } from './agenda';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
type Cancha = Prisma.CanchaGetPayload<object>;
import { Clock, DbService } from './db.service';
import { day, fail, parseDay, quote, slot, utc, money } from './format';
import { districts } from './districts';
import { distanciaKm } from '@reservaya/shared';
import { limite, orden, pagina, resumen } from '../resenas/publico';
export type Query = Record<string, string | string[] | undefined>;
export const text = (q: Query, key: string) => { const value = q[key]; return Array.isArray(value) ? value[0] : value; };
const clean = (s?: string) => s?.trim() || null;
const personSelect = { id: true, nombre: true } as const;
const canchaInclude = { complejoByComplejoId: { include: { usuarioByDuenoId: { select: personSelect } } } } as const;
type FullCancha = Prisma.CanchaGetPayload<{ include: typeof canchaInclude }>;
const compare = new Intl.Collator('en').compare;
function canchaDto(c: FullCancha) {
  const x = c.complejoByComplejoId;
  return { id: c.id, nombre: c.nombre, tipo: c.tipo, descripcion: c.descripcion, precioPorHora: money(c.precioPorHora), capacidad: c.capacidad, techada: c.techada, superficie: c.superficie, activa: c.activa, imagen: c.imagen, complejoId: c.complejoId, creadoEn: utc(c.creadoEn), complejo: x && { id: x.id, nombre: x.nombre, distrito: x.distrito, ciudad: x.ciudad, fotos: x.fotos }, dueno: x?.usuarioByDuenoId ?? null };
}
// ApiController nullable binding: empty query values mean null.
function integer(q: Query, key: string): number | null {
  const v = text(q, key);
  if (v === undefined || !v.trim()) return null;
  const result = Number(v);
  if (!/^[+-]?\d+$/.test(v.trim()) || !Number.isInteger(result) || result < -2147483648 || result > 2147483647) fail(400, `The value '${v}' is not valid.`);
  return result;
}
// Coordenada opcional (spec 68): ausente = null; presente pero no finita = 400.
function real(q: Query, key: string): number | null {
  const v = text(q, key);
  if (v === undefined || !v.trim()) return null;
  const result = Number(v.trim());
  if (!Number.isFinite(result)) fail(400, `The value '${v}' is not valid.`);
  return result;
}
export function boolean(q: Query, key: string): boolean | null {
  const v = text(q, key);
  if (v === undefined || !v.trim()) return null;
  if (/^true$/i.test(v.trim())) return true;
  if (/^false$/i.test(v.trim())) return false;
  return fail(400, `The value '${v}' is not valid.`);
}
@Injectable()
export class PublicReadService {
  constructor(@Inject(DbService) private readonly store: DbService, @Inject(Clock) private readonly clock: Clock) {}
  private get db() { return this.store.db; }
  private async habilitados() {
    const now = this.clock.now(), today = new Date(`${day(now)}T00:00:00Z`);
    return this.db.complejo.findMany({ where: { OR: [
      { creadoEn: { gt: new Date(now.getTime() - 30 * 86400000) }, usuarioByDuenoId: { rol: { not: 'USUARIO' } } },
      { suscripcionByComplejoId: { some: { estado: 'ACTIVA', fechaInicio: { lte: today }, fechaFin: { gte: today } } } },
    ] }, select: { id: true, publicado: true } });
  }
  private async visibleIds() { return (await this.habilitados()).filter(c => c.publicado).map(c => c.id); }
  private async promos(canchas: Pick<Cancha, 'id' | 'complejoId'>[]) {
    const where: Prisma.PromocionWhereInput = { activa: true, tipo: 'PRECIO_ESPECIAL', OR: [
      { canchaId: { in: canchas.map(c => c.id) } },
      { complejoId: { in: canchas.flatMap(c => c.complejoId ? [c.complejoId] : []) } },
      { canchaId: null, complejoId: null },
    ] };
    const promos: Prisma.PromocionGetPayload<object>[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.db.promocion.findMany({ where, take: 200, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      promos.push(...page);
      if (page.length < 200) break;
      cursor = page[page.length - 1].id;
    }
    return promos.sort((a,b) => Number(b.canchaId !== null)-Number(a.canchaId !== null) || Number(b.complejoId !== null)-Number(a.complejoId !== null) || b.creadoEn.getTime()-a.creadoEn.getTime());
  }
  async guardCancha(user: { id: string; rol: string } | null) {
    if (!user || user.rol === 'USUARIO' || user.rol === 'TECNICO') return;
    const propios = await this.db.complejo.findMany({ where: { OR: [{ duenoId: user.id }, { complejoMiembroByComplejoId: { some: { usuarioId: user.id, activo: true } } }] }, select: { id: true } });
    if (propios.length && !(await this.habilitados()).some(c => propios.some(p => p.id === c.id))) fail(403, 'Suscríbete para reactivar tu cancha.');
  }
  async list(q: Query, user: { id: string; rol: string } | null) {
    const activa = boolean(q, 'activas'), propias = boolean(q, 'propias');
    const where: Prisma.CanchaWhereInput = activa === null ? {} : { activa };
    if (propias === true) {
      if (!user) fail(401, 'No autenticado');
      if (user!.rol !== 'TECNICO') {
        const enabled = (await this.habilitados()).map(c => c.id);
        const accessible = await this.db.complejo.findMany({ where: { id: { in: enabled }, OR: [{ duenoId: user!.id }, { complejoMiembroByComplejoId: { some: { usuarioId: user!.id, activo: true } } }] }, select: { id: true } });
        where.complejoId = { in: accessible.map(c => c.id) };
      }
    }
    return { canchas: (await this.db.cancha.findMany({ where, include: canchaInclude, orderBy: { nombre: 'asc' } })).map(canchaDto) };
  }
  async get(id: string) {
    const c = await this.db.cancha.findUnique({ where: { id }, include: canchaInclude });
    if (!c) fail(404, 'No encontrada');
    return { cancha: canchaDto(c!) };
  }
  async disponibles(q: Query) {
    const values = Object.fromEntries(['q', 'distrito', 'ciudad', 'duenoId', 'complejoId'].map(k => [k, clean(text(q, k))]));
    const tipoRaw = text(q, 'tipo');
    const dateSlot = slot(text(q, 'fecha'), integer(q, 'horaInicio'), integer(q, 'horaFin'));
    const types = ['FUTBOL','FUTBOL5','FUTBOL7','PADEL','TENIS','BASQUET','VOLLEYBALL','LOZA'];
    // Enum.TryParse also accepts defined numeric enum values and whitespace.
    let tipo = clean(tipoRaw)?.toUpperCase();
    if (tipo && /^\d+$/.test(tipo)) tipo = types[Number(tipo)];
    if (clean(tipoRaw) && (!tipo || !types.includes(tipo))) fail(400, 'Tipo inválido');
    const visible = await this.visibleIds();
    const where: Prisma.CanchaWhereInput = { activa: true, OR: [{ complejoId: null }, { complejoId: { in: visible } }] };
    const and: Prisma.CanchaWhereInput[] = [];
    const contains = (s: string) => ({ contains: s.replace(/[%_]/g, ''), mode: 'insensitive' as const });
    if (values.q) and.push({ OR: [{ nombre: contains(values.q) }, { descripcion: contains(values.q) }, { complejoByComplejoId: { nombre: contains(values.q) } }] });
    if (values.distrito) and.push({ complejoByComplejoId: { distrito: contains(values.distrito) } });
    if (values.ciudad) and.push({ OR: [{ complejoId: null }, { complejoByComplejoId: { ciudad: contains(values.ciudad) } }] });
    if (values.duenoId) and.push({ complejoByComplejoId: { duenoId: values.duenoId } });
    if (values.complejoId) and.push({ complejoId: values.complejoId });
    if (tipo) where.tipo = tipo as Prisma.CanchaWhereInput['tipo'];
    where.AND = and;
    let canchas = await this.db.cancha.findMany({ where, include: canchaInclude, orderBy: { nombre: 'asc' } });
    const total = canchas.length, limiteAplicado = Object.values(values).every(v => v === null) && !clean(tipoRaw) && !dateSlot && total > 10;
    if (limiteAplicado) canchas = canchas.slice(0, 10);
    const occupied = new Set(dateSlot ? (await this.db.reserva.findMany({ where: { canchaId: { in: canchas.map(c => c.id) }, fecha: dateSlot.fecha, estado: 'CONFIRMADA', horaInicio: { lt: dateSlot.fin }, horaFin: { gt: dateSlot.inicio } }, select: { canchaId: true } })).map(r => r.canchaId) : []);
    const promos = dateSlot ? await this.promos(canchas) : [];
    // Spec 68: con lat+lng se ordena por distancia (Haversine en memoria:
    // son pocas) y cada item trae distanciaKm; sin coordenadas van al final.
    const lat = real(q, 'lat'), lng = real(q, 'lng');
    if ((lat === null) !== (lng === null)) fail(400, 'Se requieren lat y lng');
    if (lat !== null && (lat < -90 || lat > 90)) fail(400, 'Latitud inválida');
    if (lng !== null && (lng < -180 || lng > 180)) fail(400, 'Longitud inválida');
    const yo = lat !== null && lng !== null ? { latitud: lat, longitud: lng } : null;
    const items = canchas.map(c => {
      const dto = canchaDto(c);
      const x = c.complejoByComplejoId;
      const punto = x?.latitud != null && x?.longitud != null ? { latitud: x.latitud, longitud: x.longitud } : null;
      return { c, dto, punto, distanciaKm: yo && punto ? distanciaKm(yo, punto) : null };
    });
    if (yo) items.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
    return { ok: true, total, limiteAplicado, canchas: items.map(({ c, dto, punto, distanciaKm: d }) => {
      const disponible = !occupied.has(dto.id);
      const price = dateSlot ? quote(c.precioPorHora, promos.filter(p => p.canchaId === dto.id || p.complejoId === dto.complejoId || (p.canchaId === null && p.complejoId === null)), dateSlot.fecha, dateSlot.inicio, dateSlot.fin) : null;
      return { cancha: { ...dto, complejo: dto.complejo && { ...dto.complejo, latitud: punto?.latitud ?? null, longitud: punto?.longitud ?? null } }, disponible, motivo: disponible ? null : 'Ocupada en ese horario', totalEstimado: price?.total ?? null, reglaPrecio: price?.regla ?? null, distanciaKm: d };
    }) };
  }
  async opciones() {
    const visible = await this.visibleIds();
    const complejos = await this.db.complejo.findMany({ where: { publicado: true, id: { in: visible } }, include: { usuarioByDuenoId: { select: personSelect } }, orderBy: { nombre: 'asc' } });
    const canchas = await this.db.cancha.findMany({ where: { activa: true, OR: [{ complejoId: null }, { complejoId: { in: visible } }] }, select: { nombre: true }, orderBy: { nombre: 'asc' } });
    const duenos = [...new Map(complejos.map(c => [c.usuarioByDuenoId.id, c.usuarioByDuenoId])).values()].sort((a,b) => compare(a.nombre,b.nombre));
    return { ok: true, distritos: districts, ciudades: ['Arequipa'], duenos, complejos: complejos.map(c => ({ id: c.id, nombre: c.nombre, distrito: c.distrito, ciudad: c.ciudad })), sugerencias: [...new Set([...complejos.map(c => c.nombre), ...canchas.map(c => c.nombre)])].sort(compare) };
  }
  async agenda(id: string, q: Query) {
    const raw = text(q, 'fecha');
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || !parseDay(raw)) fail(400, 'Fecha inválida (AAAA-MM-DD)');
    const fecha = parseDay(raw)!;
    const cancha = await this.db.cancha.findUnique({ where: { id }, include: canchaInclude });
    if (!cancha?.activa || (cancha.complejoId && !(await this.visibleIds()).includes(cancha.complejoId))) fail(404, 'Cancha no disponible');
    let horarios = cancha!.complejoId ? await this.db.horarioOperativo.findMany({ where: { complejoId: cancha!.complejoId, canchaId: id } }) : [];
    if (!horarios.length && cancha!.complejoId) horarios = await this.db.horarioOperativo.findMany({ where: { complejoId: cancha!.complejoId, canchaId: null } });
    // Igual que Reservas.slot: si existe calendario, un día ausente es cerrado.
    const horario = horarios.find(h => h.diaSemana === fecha.getUTCDay());
    if (horarios.length && !horario?.activo) return { fecha: raw, canchaId: id, anticipacionMinMin: 0, franjas: [] };
    const reservas = await this.db.reserva.findMany({ where: { canchaId: id, fecha, estado: 'CONFIRMADA' }, select: { horaInicio: true, horaFin: true } });
    const anticipacion = (cancha!.complejoByComplejoId as { anticipacionMinMin?: number } | null)?.anticipacionMinMin ?? 0;
    return { fecha: raw, canchaId: id, anticipacionMinMin: anticipacion,
      franjas: agendaFranjas({ fecha, apertura: horario?.aperturaMin ?? 480, cierre: horario?.cierreMin ?? 1260,
        reservas, ahora: this.clock.now(), anticipacion, base: cancha!.precioPorHora, promos: await this.promos([cancha!]) }) };
  }
  async cotizar(id: string, q: Query) {
    // Binding runs before the action; action validates cancha before slot.
    const inicio = integer(q, 'horaInicio'), fin = integer(q, 'horaFin');
    const c = await this.db.cancha.findUnique({ where: { id } });
    if (!c) fail(404, 'No encontrada');
    if (!c!.activa) fail(400, 'Cancha no disponible');
    const s = slot(text(q, 'fecha'), inicio, fin, true)!;
    const price = quote(c!.precioPorHora, await this.promos([c!]), s.fecha, s.inicio, s.fin);
    return { ok: true, total: price.total, moneda: 'PEN', regla: price.regla };
  }
  async complejoPublico(slug: string) {
    const visible = await this.visibleIds();
    const complejo = await this.db.complejo.findFirst({
      where: { slug, publicado: true, id: { in: visible } },
      select: { id: true, slug: true, nombre: true, direccion: true, distrito: true, ciudad: true, telefono: true, descripcion: true, fotos: true, latitud: true, longitud: true },
    });
    if (!complejo) return fail(404, 'No encontrado');
    const [canchas, valoracion] = await Promise.all([
      this.db.cancha.findMany({
        where: { complejoId: complejo.id, activa: true }, orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, tipo: true, precioPorHora: true, imagen: true, techada: true, superficie: true, capacidad: true },
      }),
      resumen(this.db, complejo.id),
    ]);
    return {
      complejo: { slug: complejo.slug, nombre: complejo.nombre, direccion: complejo.direccion, distrito: complejo.distrito,
        ciudad: complejo.ciudad, telefono: complejo.telefono, descripcion: complejo.descripcion,
        fotos: complejo.fotos, latitud: complejo.latitud, longitud: complejo.longitud,
        imagen: complejo.fotos[0] ?? canchas.find(c => c.imagen)?.imagen ?? null },
      canchas: canchas.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, precioPorHora: money(c.precioPorHora),
        imagen: c.imagen, techada: c.techada, superficie: c.superficie, capacidad: c.capacidad })),
      valoracion: { promedio: valoracion.promedio, total: valoracion.total },
    };
  }
  // Acepta complejoId (tarjetas de /canchas) o slug (perfil /c/[slug], que no expone el id interno).
  async resenas(q: Query) {
    const id = clean(text(q, 'complejoId')), slug = clean(text(q, 'slug'));
    if (!id && !slug) fail(400, 'complejoId o slug es requerido');
    const o = orden(text(q, 'orden')), n = limite(text(q, 'limite')), cursor = clean(text(q, 'cursor')) ?? undefined;
    const visible = await this.visibleIds();
    const complejoId = id ?? (await this.db.complejo.findFirst({ where: { slug: slug!, publicado: true }, select: { id: true } }))?.id;
    if (!complejoId || !visible.includes(complejoId)) fail(404, 'No encontrado');
    const [r, p] = await Promise.all([resumen(this.db, complejoId!), pagina(this.db, complejoId!, o, n, cursor)]);
    return { ok: true, ...r, orden: o, ...p };
  }
  async partidos(q: Query, user: { id: string; rol: string } | null) {
    const now = this.clock.now();
    // DateTime.Today in legacy uses the host calendar; DB date is timezone-free.
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())), nivel = text(q, 'nivel'), search = clean(text(q, 'q'));
    const where: Prisma.PartidoAbiertoWhereInput = { fecha: { gte: today } };
    if (nivel && ['Principiante','Intermedio','Avanzado'].includes(nivel)) where.nivel = nivel;
    if (search) where.OR = ['titulo','distrito','cancha'].map(k => ({ [k]: { contains: search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_'), mode: 'insensitive' } }));
    const partidos = await this.db.partidoAbierto.findMany({ where, include: { usuarioByOrganizadorId: { select: personSelect }, anotacionPartidoByPartidoId: { select: { usuarioId: true } } }, orderBy: [{ fecha: 'asc' }, { desdeMin: 'asc' }] });
    const time = (n: number) => `${String(Math.trunc(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
    return { ok: true, partidos: partidos.map(p => {
      const f = day(p.fecha), delta = (p.fecha.getTime() - today.getTime()) / 86400000;
      const fechaCorta = delta === 0 ? 'Hoy' : delta === 1 ? 'Mañana' : `${f.slice(8,10)}/${f.slice(5,7)}`, desde = time(p.desdeMin);
      return { id:p.id,titulo:p.titulo,descripcion:p.descripcion,formato:p.formato,nivel:p.nivel,cuposTotales:p.cuposTotales,cuposLibres:Math.max(0,p.cuposTotales-p.anotacionPartidoByPartidoId.length),distrito:p.distrito,cancha:p.cancha,superficie:p.superficie,precio:p.precio.toNumber(),fecha:f,desde,hasta:time(p.hastaMin),cuando:`${fechaCorta} ${desde}`,fechaCorta,horaCorta:desde,fotoUrl:p.fotoUrl,anotado:p.anotacionPartidoByPartidoId.some(a=>a.usuarioId===user?.id),inscritos:[],organizador:p.usuarioByOrganizadorId,creadoEn:utc(p.creadoEn) };
    }) };
  }
}
