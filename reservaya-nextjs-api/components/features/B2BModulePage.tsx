import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/session';
import { canAccess, canSeeMoney, fallbackPorRol } from '@/lib/permissions';
import { btnPrimary, card, eyebrow, badgeOk } from '@/lib/b2b-theme';

// Módulos ya migrados a componentes reales — B2BModulePage no los renderiza.
const MIGRATED = ['complejos', 'caja', 'equipo', 'ayuda', 'validar-codigo', 'reportes', 'metas'] as const;

type ModuleItem = { name: string; detail: string; status?: string; amount?: string };

// Placeholders transitorios para módulos aún sin endpoint .NET.
// Se mantienen para no romper el sidebar; cada uno indica su contrato API.
const content: Record<string, { eyebrow: string; title: string; description: string; api: string; items: ModuleItem[] }> = {
  agenda: {
    eyebrow: 'Operación', title: 'Agenda y reservas',
    description: 'Ocupación del día por cancha. Conecta GET /api/reservas?fecha=hoy.',
    api: 'GET /api/reservas',
    items: [
      { name: 'Hoy · 18:00', detail: 'Cancha Central · Fútbol 7', status: 'Confirmada' },
      { name: 'Hoy · 20:00', detail: 'Cancha Norte · Pádel', status: 'Pendiente' },
    ],
  },
  reportes: {
    eyebrow: 'Análisis & ventas', title: 'Metas y Reportes',
    description: 'Ocupación, ingresos y objetivos B2B. GET /api/reportes/global.',
    api: 'GET /api/reportes/global',
    items: [
      { name: 'Ventas del mes', detail: 'Reservas confirmadas', amount: 'S/ —' },
      { name: 'Ocupación promedio', detail: 'Todas las sedes', amount: '—' },
    ],
  },
  metas: {
    eyebrow: 'Análisis & ventas', title: 'Metas',
    description: 'Objetivos comerciales por sede. GET /api/metas.',
    api: 'GET /api/metas',
    items: [{ name: 'Ventas mensuales', detail: 'Define tu primera meta', status: 'Pendiente' }],
  },
  descuentos: {
    eyebrow: 'Análisis & ventas', title: 'Promociones',
    description: 'Descuentos y precios especiales mañana/noche. GET /api/promociones.',
    api: 'GET /api/promociones',
    items: [{ name: 'Precio mañana', detail: 'Lun–Vie · 09:00–17:00', amount: 'S/ —', status: 'Borrador' }],
  },
  'precios-especiales': {
    eyebrow: 'Análisis & ventas', title: 'Precios especiales',
    description: 'Tarifas dinámicas por horario. GET /api/promociones?tipo=PRECIO_ESPECIAL.',
    api: 'GET /api/promociones',
    items: [{ name: 'Nocturno', detail: '18:00–23:00', amount: 'S/ —' }],
  },
  abonos: {
    eyebrow: 'Comercial', title: 'Abonos',
    description: 'Packs de horas y mensualidades. GET /api/promociones?tipo=ABONO.',
    api: 'GET /api/promociones',
    items: [{ name: 'Pack 10 horas', detail: 'Válido toda la semana', status: 'Borrador' }],
  },
  canchas: {
    eyebrow: 'Gestión del negocio', title: 'Canchas',
    description: 'CRUD ya conectado a .NET. Ver Gestión de canchas.',
    api: 'GET /api/canchas',
    items: [],
  },
  reservas: {
    eyebrow: 'Operación', title: 'Reservas',
    description: 'Tabla admin conectada a .NET.',
    api: 'GET /api/reservas',
    items: [],
  },
  resenas: {
    eyebrow: 'Experiencia', title: 'Reseñas',
    description: 'Valoraciones de jugadores. GET /api/complejos/:id/resenas.',
    api: 'GET /api/resenas',
    items: [{ name: 'Sin reseñas aún', detail: 'Comparte tu página para recibir las primeras', status: '—' }],
  },
  configuracion: {
    eyebrow: 'Administración', title: 'Configuración',
    description: 'Horarios, notificaciones y pagos.',
    api: '—',
    items: [
      { name: 'Datos del complejo', detail: 'Nombre, dirección y contacto', status: 'Configurar' },
      { name: 'Horarios y tarifas', detail: 'Disponibilidad semanal', status: 'Configurar' },
    ],
  },
  torneos: {
    eyebrow: 'Extras · BETA', title: 'Torneos [BETA]',
    description: 'Inscripciones y fixtures. GET /api/torneos.',
    api: 'GET /api/torneos',
    items: [{ name: 'Copa ReservaYa', detail: 'Fútbol 7 · cupo 16', status: 'Borrador' }],
  },
  novedades: {
    eyebrow: 'Extras & ayuda', title: 'Novedades',
    description: 'Feed de actualizaciones de la plataforma.',
    api: '—',
    items: [{ name: 'Caja / POS real', detail: 'Este sprint: CajaSesion + QR recepción', status: 'Nuevo' }],
  },
};

export async function B2BModulePage({ module }: { module: string }) {
  if ((MIGRATED as readonly string[]).includes(module)) {
    redirect(`/admin/${module === 'validar-codigo' ? 'validar-codigo' : module}`);
  }
  const session = await requireRole(['ADMIN', 'SUPERADMIN', 'TECNICO']);
  if (!canAccess(module, session.rol)) redirect(fallbackPorRol(session.rol));

  const data = content[module] ?? {
    eyebrow: 'Panel', title: module, description: 'Módulo en construcción.', api: '—', items: [],
  };
  const verDinero = canSeeMoney(session.rol);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>{data.eyebrow}</p>
          <h1 className="text-3xl font-black text-[#060C08]">{data.title}</h1>
          <p className="mt-2 text-gray-500">{data.description}</p>
          <p className="mt-1 font-mono text-xs text-gray-400">{data.api}</p>
        </div>
        <button className={btnPrimary}>＋ Nuevo</button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={card}><p className="text-sm text-gray-500">Estado</p><p className="mt-1 text-xl font-bold text-[#060C08]">En integración</p></div>
        <div className={card}><p className="text-sm text-gray-500">Rol actual</p><p className="mt-1 text-xl font-bold text-[#060C08]">{session.rol}</p></div>
        <div className={card}><p className="text-sm text-gray-500">Visibilidad</p><p className="mt-1 text-xl font-bold text-[#060C08]">{verDinero ? 'Completa' : 'Operativa'}</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-6 py-4"><h2 className="font-semibold text-[#060C08]">Resumen</h2></div>
        <div className="divide-y divide-[#E5E7EB]">
          {data.items.length === 0 && (
            <p className="px-6 py-6 text-sm text-gray-500">Usa el panel dedicado de este módulo (ver sidebar).</p>
          )}
          {data.items.map((item) => (
            <div key={item.name} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div><p className="font-semibold text-[#060C08]">{item.name}</p><p className="text-sm text-gray-500">{item.detail}</p></div>
              <div className="flex items-center gap-4">
                {item.amount && verDinero && <span className="font-bold text-[#15803D]">{item.amount}</span>}
                {item.status && <span className={badgeOk}>{item.status}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!verDinero && <p className="mt-4 text-xs text-gray-500">Ves operación diaria. Las ganancias globales solo las ve el dueño.</p>}
    </div>
  );
}
