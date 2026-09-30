import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { canAccess, fallbackPorRol } from '@/lib/permissions';
import { getCanchas, getReservas } from '@/lib/api';
import { getComplejos } from '@/lib/b2b-api';
import { CronogramaView } from '@/components/b2b/CronogramaView';
import { crearCarga } from '@/lib/carga';
import { AvisoCarga } from '@/components/ui/AvisoCarga';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const carga = crearCarga();

  const sessionPromise = getSession();
  const canchasPromise = carga.de(getCanchas(true), [], 'las canchas');
  const reservasPromise = carga.de(getReservas(), [], 'las reservas');
  const complejosPromise = carga.de(getComplejos(), [], 'los complejos');

  const session = await sessionPromise;
  if (!session) redirect('/login');
  if (!canAccess('agenda', session.rol)) redirect(fallbackPorRol(session.rol));

  const [canchas, reservas, complejos] = await Promise.all([
    canchasPromise,
    reservasPromise,
    complejosPromise,
  ]);

  const canchasCronograma = canchas.map(({ id, nombre, precioPorHora, complejoId }) => ({
    id,
    nombre,
    precioPorHora,
    complejoId,
  }));
  const reservasCronograma = reservas.map((reserva) => ({
    id: reserva.id,
    codigo: reserva.codigo,
    canchaId: reserva.canchaId,
    fecha: reserva.fecha,
    horaInicio: reserva.horaInicio,
    horaFin: reserva.horaFin,
    estado: reserva.estado,
    total: reserva.total,
    notas: reserva.notas,
    cancha: { nombre: reserva.cancha.nombre },
    usuario: reserva.usuario ? { nombre: reserva.usuario.nombre } : null,
  }));
  const complejosCronograma = complejos.map(({ id, nombre }) => ({ id, nombre }));

  return (
    <>
      <AvisoCarga errores={carga.errores} />
      <CronogramaView
        canchas={canchasCronograma}
        reservasIniciales={reservasCronograma}
        complejos={complejosCronograma}
        fechaInicial={new Date().toISOString().slice(0, 10)}
      />
    </>
  );
}
