// Cliente B2B para Client Components: fetch('/api/...') con credentials include.
// Sin mocks: todo sale del backend .NET. Este módulo NO importa next/headers.

export type CategoriaProducto = 'SNACK' | 'ALQUILER' | 'SERVICIO';
export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'CULQI' | 'TARJETA' | 'TRANSFERENCIA';
export type TipoMovimiento =
  | 'RESERVA'
  | 'SNACK'
  | 'ALQUILER'
  | 'ABONO'
  | 'EGRESO'
  | 'AJUSTE';
export type TipoMeta = 'INGRESOS' | 'OCUPACION' | 'RESERVAS';

export interface ProductoCaja {
  id: string;
  nombre: string;
  categoria: string;
  precio: string;
  stock: number | null;
  activo: boolean;
}

export interface MovimientoCaja {
  id: string;
  descripcion: string;
  monto: string;
  metodoPago: string;
  tipo: string;
  creadoEn: string;
}

export interface CajaAbierta {
  id: string;
  estado: string;
  montoInicial: string;
  montoFinal: string | null;
  abiertaEn: string;
  cerradaEn: string | null;
}

export interface ResumenCaja {
  montoInicial: string;
  ingresos: string;
  egresos: string;
  esperado: string;
  movimientos: number;
}

export interface MetaDto {
  id: string;
  titulo: string;
  tipo: string;
  objetivo: string;
  actual: string;
  periodoInicio: string;
  periodoFin: string;
}

export class B2BApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'B2BApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new B2BApiError(res.status, body?.error ?? `Error ${res.status}`);
  return body as T;
}

export const soles = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

// ---------- Caja ----------
export function getCajaHoy() {
  return request<{ total: string; movimientos: MovimientoCaja[]; caja: CajaAbierta | null }>(
    '/api/caja/hoy'
  );
}

export function getCajaSesion() {
  return request<{ caja: CajaAbierta | null; resumen: ResumenCaja }>('/api/caja/sesion');
}

export function abrirCaja(montoInicial: number) {
  return request<{ ok: boolean; caja: CajaAbierta }>('/api/caja/apertura', {
    method: 'POST',
    body: JSON.stringify({ montoInicial }),
  });
}

export function cerrarCaja(montoFinal: number) {
  return request<{ ok: boolean; caja: CajaAbierta; resumen: ResumenCaja; diferencia: string }>(
    '/api/caja/cierre',
    { method: 'POST', body: JSON.stringify({ montoFinal }) }
  );
}

export function cobrarTicket(input: {
  items: { productoId?: string; nombre?: string; precio?: number; cantidad: number }[];
  metodoPago: MetodoPago;
}) {
  return request<{ ok: boolean; total: string; movimientos: MovimientoCaja[] }>(
    '/api/caja/movimientos',
    { method: 'POST', body: JSON.stringify(input) }
  );
}

export function registrarMovimiento(input: {
  descripcion: string;
  monto: number;
  tipo: TipoMovimiento;
  metodoPago: MetodoPago;
}) {
  return request<{ ok: boolean; total: string; movimientos: MovimientoCaja[] }>(
    '/api/caja/movimientos',
    { method: 'POST', body: JSON.stringify(input) }
  );
}

// ---------- Productos ----------
export function getProductos() {
  return request<{ productos: ProductoCaja[] }>('/api/caja/productos');
}

export function crearProducto(input: {
  nombre: string;
  categoria: CategoriaProducto;
  precio: number;
  stock?: number | null;
}) {
  return request<{ ok: boolean; producto: ProductoCaja }>('/api/caja/productos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarProducto(
  id: string,
  input: Partial<{ nombre: string; categoria: CategoriaProducto; precio: number; stock: number | null }>
) {
  return request<{ ok: boolean; producto: ProductoCaja }>(`/api/caja/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function eliminarProducto(id: string) {
  return request<{ ok: boolean }>(`/api/caja/productos/${id}`, { method: 'DELETE' });
}

// ---------- Metas ----------
export function getMetas() {
  return request<{ metas: MetaDto[] }>('/api/metas');
}

export function crearMeta(input: {
  titulo: string;
  tipo: TipoMeta;
  objetivo: number;
  periodoInicio: string;
  periodoFin: string;
}) {
  return request<{ ok: boolean; meta: MetaDto }>('/api/metas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function actualizarMeta(
  id: string,
  input: Partial<{
    titulo: string;
    tipo: TipoMeta;
    objetivo: number;
    actual: number;
    periodoInicio: string;
    periodoFin: string;
  }>
) {
  return request<{ ok: boolean; meta: MetaDto }>(`/api/metas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function eliminarMeta(id: string) {
  return request<{ ok: boolean }>(`/api/metas/${id}`, { method: 'DELETE' });
}
