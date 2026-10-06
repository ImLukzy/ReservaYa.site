'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import type { Solicitud } from '@/lib/api-types';
import { ApiError } from '@/lib/api-types';
import { aprobarSolicitud, rechazarSolicitud } from '@/lib/solicitudes-client';
import { TIPOS_CANCHA } from '@/lib/solicitudes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

const MOTIVO_MIN = 10;
type Accion = { tipo: 'aprobar' | 'rechazar'; solicitud: Solicitud };
type Aviso = { tono: 'ok' | 'alerta'; texto: string };

const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const tipoLabel = (t: string) => TIPOS_CANCHA.find((x) => x.valor === t)?.etiqueta ?? t;

// Cola del supervisor (spec 55 F3): aprobar convierte al jugador en dueño y arranca su prueba;
// rechazar exige motivo, que viaja por correo (sin tabla para guardarlo, BLOQUEO-1).
export function SolicitudesPanel({ iniciales }: { iniciales: Solicitud[] }) {
  const router = useRouter();
  const [lista, setLista] = useState(iniciales);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function abrir(a: Accion) {
    setAccion(a);
    setMotivo('');
    setErrorModal('');
  }

  async function confirmar() {
    if (!accion) return;
    const { solicitud: s, tipo } = accion;
    if (tipo === 'rechazar' && motivo.trim().length < MOTIVO_MIN) {
      setErrorModal(`Explica el motivo en al menos ${MOTIVO_MIN} caracteres: el jugador lo recibe por correo.`);
      return;
    }
    setEnviando(true);
    setErrorModal('');
    try {
      let texto = '';
      let tono: Aviso['tono'] = 'ok';
      if (tipo === 'aprobar') {
        await aprobarSolicitud(s.id);
        texto = `${s.complejo.nombre} aprobado. ${s.solicitante?.nombre ?? 'El jugador'} ya es dueño y su prueba de 30 días empezó.`;
      } else {
        const r = await rechazarSolicitud(s.id, motivo.trim());
        if (r.emailEnviado === false) {
          tono = 'alerta';
          texto = `Rechazo guardado, pero el correo no salió. Avisa el motivo a ${s.solicitante?.email ?? 'el jugador'} por otro medio.`;
        } else {
          texto = `${s.complejo.nombre} rechazado. Enviamos el motivo por correo.`;
        }
      }
      setLista((prev) => prev.filter((x) => x.id !== s.id));
      setAviso({ tono, texto });
      setAccion(null);
      router.refresh();
    } catch (e) {
      setErrorModal(
        e instanceof ApiError && e.status === 404
          ? 'Esta acción todavía no está disponible en el servidor.'
          : e instanceof Error
            ? e.message
            : 'No se pudo completar la acción.'
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div aria-live="polite">
        {aviso && (
          <p
            role="status"
            className={
              aviso.tono === 'ok'
                ? 'mb-4 rounded-xl border border-cesped bg-cesped-suave px-4 py-3 text-sm font-semibold text-cesped-hondo'
                : 'mb-4 rounded-xl border border-sol bg-sol-suave px-4 py-3 text-sm font-semibold text-sol-hondo'
            }
          >
            {aviso.texto}
          </p>
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No hay solicitudes por revisar"
          description="Cuando un jugador envíe su centro deportivo, aparecerá aquí."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((s) => (
            <li key={s.id} className="card-tactil flex flex-col gap-4 p-5 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-basalto">{s.complejo.nombre}</p>
                <p className="text-sm text-pizarra">
                  {s.complejo.distrito}
                  {s.complejo.direccion ? ` · ${s.complejo.direccion}` : ''}
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-pizarra">Solicitante</dt>
                    <dd className="truncate font-medium text-basalto">{s.solicitante?.nombre ?? '—'}</dd>
                    {s.solicitante?.email && <dd className="truncate text-xs text-pizarra">{s.solicitante.email}</dd>}
                  </div>
                  <div>
                    <dt className="text-pizarra">Cancha</dt>
                    <dd className="font-medium text-basalto">
                      {s.cancha ? `${s.cancha.nombre} · ${tipoLabel(s.cancha.tipo)} · S/ ${Number(s.cancha.precioPorHora)}/h` : 'Sin cancha'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-pizarra">Enviada</dt>
                    <dd className="font-medium tabular-nums text-basalto">{fecha(s.creadoEn)}</dd>
                    {s.complejo.telefono && <dd className="text-xs text-pizarra">Tel. {s.complejo.telefono}</dd>}
                  </div>
                </dl>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => abrir({ tipo: 'rechazar', solicitud: s })}>
                  Rechazar
                </Button>
                <Button onClick={() => abrir({ tipo: 'aprobar', solicitud: s })}>Aprobar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={accion !== null}
        onClose={() => !enviando && setAccion(null)}
        tono="claro"
        title={accion?.tipo === 'aprobar' ? 'Aprobar centro' : 'Rechazar centro'}
      >
        {accion && (
          <div className="space-y-4">
            {accion.tipo === 'aprobar' ? (
              <p className="text-sm text-pizarra">
                <strong className="text-basalto">{accion.solicitud.complejo.nombre}</strong> se publicará con su cancha y la
                cuenta de {accion.solicitud.solicitante?.nombre ?? 'el jugador'} pasará a dueño. Su prueba de 30 días empieza ahora.
              </p>
            ) : (
              <Input
                id="motivo-rechazo"
                multilinea
                filas={4}
                claseCampo="h-auto py-2.5"
                etiqueta="Motivo del rechazo"
                nota="Lo recibe por correo. Dile qué corregir para que pueda enviarlo de nuevo."
                value={motivo}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMotivo(e.target.value)}
                aria-invalid={errorModal ? true : undefined}
              />
            )}
            {errorModal && (
              <p role="alert" className="text-sm font-semibold text-error">
                {errorModal}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAccion(null)} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                variant={accion.tipo === 'aprobar' ? 'primary' : 'danger'}
                onClick={confirmar}
                loading={enviando}
              >
                {accion.tipo === 'aprobar' ? 'Aprobar y publicar' : 'Rechazar y avisar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
