"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EstadoConvenio } from '@/lib/convenio';
import { solicitarSuscripcion } from '@/lib/suscripciones-client';
import { Button } from '@/components/ui/Button';

export default function ConvenioPanel({ estados, bloqueado }: { estados: EstadoConvenio[]; bloqueado: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 60000);
    return () => window.clearInterval(timer);
  }, [router]);
  const [plan, setPlan] = useState('MENSUAL');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function solicitar(id: string) {
    setEnviando(true); setMensaje('');
    try { await solicitarSuscripcion(id, plan); setMensaje('Solicitud enviada. El equipo técnico debe aprobarla para activar tu suscripción.'); router.refresh(); }
    catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo solicitar la suscripción.'); }
    finally { setEnviando(false); }
  }
  return <section className="mb-6 rounded-xl border border-cal bg-tiza p-5" aria-labelledby="convenio-titulo">
    <h2 id="convenio-titulo" className="text-xl font-bold">{bloqueado ? 'Suscríbete para reactivar tu cancha' : 'Tu convenio de prueba'}</h2>
    {estados.map(e => <div key={e.complejoId} className="mt-4 border-t border-cal pt-4">
      <h3 className="font-bold">{e.nombre}</h3>
      <p>{e.activa ? 'Suscripción activa.' : e.enPrueba ? `Prueba gratis: quedan ${e.diasRestantes} días. Máximo una cancha; luego necesitas una suscripción activa.` : 'La prueba venció. Tu cancha queda fuera de la búsqueda y no recibe reservas hasta activar una suscripción.'}</p>
      {!e.activa && <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1">Periodo de suscripción
          <select value={plan} onChange={event => setPlan(event.target.value)} className="rounded-control border border-cal bg-sillar px-3 py-2">
            <option value="MENSUAL">Mensual</option><option value="TRIMESTRAL">Trimestral</option><option value="ANUAL">Anual</option>
          </select>
        </label>
        <Button disabled={enviando} onClick={() => solicitar(e.complejoId)}>{enviando ? 'Enviando…' : 'Solicitar suscripción'}</Button>
      </div>}
    </div>)}
    {mensaje && <p role="status" className="mt-4">{mensaje}</p>}
  </section>;
}
