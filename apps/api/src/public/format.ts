import { HttpException } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
type Promocion = Prisma.PromocionGetPayload<object>;
export const fail = (status: number, error: string): never => { throw new HttpException({ error }, status); };
export const money = (value: Prisma.Decimal) => value.toFixed(2);
// .NET System.Text.Json omits trailing fractional zeros in UTC DateTime.
export const utc = (value: Date) => value.toISOString().replace(/\.000Z$/, 'Z').replace(/(\.\d*?[1-9])0+Z$/, '$1Z');
export const day = (value: Date) => value.toISOString().slice(0, 10);
export function parseDay(value?: string): Date | null {
  if (!value?.trim()) return null;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = new Date(`${text}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && day(d) === text ? d : null;
  }
  const d = new Date(text);
  return Number.isFinite(d.getTime()) ? new Date(`${day(d)}T00:00:00Z`) : null;
}
export function slot(fecha: string | undefined, inicio: number | null, fin: number | null, required = false) {
  if (fecha === undefined && inicio === null && fin === null) {
    if (required) fail(400, 'Fecha y horario requeridos');
    return null;
  }
  if (fecha === undefined || inicio === null || fin === null) fail(400, 'Fecha, hora de inicio y hora de fin van juntas');
  const date = parseDay(fecha);
  if (!date) fail(400, 'Fecha inválida');
  if (inicio! < 0 || inicio! >= 1440 || fin! < 1 || fin! > 1440 || fin! <= inicio!) fail(400, 'Horario inválido: la hora de fin debe ser posterior a la de inicio');
  return { fecha: date!, inicio: inicio!, fin: fin! };
}
export function quote(base: Prisma.Decimal, promos: Promocion[], fecha: Date, inicio: number, fin: number) {
  let total = new Prisma.Decimal(0), regla: string | null = null;
  // Spec63: prorrateo aprobado por media hora. Cortes de promo conservan
  // las bandas y el redondeo acumulado hace aditivos los céntimos por franja.
  const cortes = promos.flatMap(p => [p.horaDesde, p.horaHasta, p.inicioTarde ?? 1020, p.inicioNoche ?? 1200]).filter((n): n is number => n !== null);
  for (let h = inicio; h < fin;) {
    const hasta = Math.min(fin, (Math.floor(h / 30) + 1) * 30, ...cortes.filter(n => n > h));
    let price = base;
    for (const p of promos) {
      if (p.diasSemana?.length && !p.diasSemana.includes(fecha.getUTCDay())) continue;
      const f = day(fecha), start = p.fechaInicio && day(p.fechaInicio), end = p.fechaFin && day(p.fechaFin);
      if (p.repetirAnual && (start || end)) {
        const md = f.slice(5), a = start?.slice(5), b = end?.slice(5);
        if (a && b ? (a <= b ? md < a || md > b : md < a && md > b) : (a && md < a) || (b && md > b)) continue;
      } else if ((start && f < start) || (end && f > end)) continue;
      let candidate: Prisma.Decimal | null = null;
      if (p.precioDia !== null || p.precioTarde !== null || p.precioNoche !== null) {
        candidate = h < (p.inicioTarde ?? 1020) ? p.precioDia : h < (p.inicioNoche ?? 1200) ? p.precioTarde : p.precioNoche;
      } else if (p.valor.gt(0) && (p.horaDesde === null || h >= p.horaDesde) && (p.horaHasta === null || h < p.horaHasta)) candidate = p.valor;
      if (candidate === null) continue;
      price = candidate; regla ??= p.nombre; break;
    }
    const acumulado = (minuto: number) => price.mul(minuto).div(60).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    total = total.plus(acumulado(hasta).minus(acumulado(h)));
    h = hasta;
  }
  return { total: total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2), regla };
}
