'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircleReply, Star, X } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { EmptyState } from '@/components/ui/EmptyState';

interface Resena {
  id: string;
  estrellas: number;
  comentario: string;
  jugador: string;
  fecha: string;
  respuesta?: string | null;
}

function parseResenas(body: unknown): Resena[] {
  const pick = (arr: unknown[]): Resena[] =>
    arr.map((r) => {
      const x = r as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        estrellas: Number(x.estrellas ?? x.puntaje ?? x.rating ?? 0),
        comentario: String(x.comentario ?? x.texto ?? x.mensaje ?? ''),
        jugador: String(
          (x.jugador as Record<string, unknown> | undefined)?.nombre ??
            x.jugadorNombre ??
            x.usuarioNombre ??
            x.autor ??
            'Jugador'
        ),
        fecha: String(x.fecha ?? x.creadoEn ?? x.createdAt ?? ''),
        respuesta: (x.respuesta ?? x.respuestaDueno ?? null) as string | null,
      };
    });
  if (Array.isArray(body)) return pick(body);
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.resenas)) return pick(b.resenas);
    if (Array.isArray(b.reviews)) return pick(b.reviews);
    if (Array.isArray(b.data)) return pick(b.data);
  }
  return [];
}

function Estrellas({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={15}
          strokeWidth={0}
          className={i <= Math.round(n) ? 'fill-sol text-sol' : 'fill-cal text-cal'}
        />
      ))}
    </span>
  );
}

function fechaCorta(f: string): string {
  if (!f) return '';
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return f.slice(0, 10);
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// GET /api/resenas (404 = aún sin reseñas). Lanza si la API falla.
async function obtenerResenas(): Promise<Resena[]> {
  const res = await fetch('/api/resenas', { credentials: 'include', cache: 'no-store' });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return parseResenas(await res.json().catch(() => null));
}

export function ResenasPanel() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<Resena | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // setState solo en callbacks de la promesa; el reintento usa `recargar`.
  const cargar = useCallback(
    () =>
      obtenerResenas()
        .then(setResenas, () => {
          setError('No se pudieron cargar las reseñas. Revisa tu conexión e inténtalo de nuevo.');
          setResenas([]);
        })
        .finally(() => setCargando(false)),
    []
  );

  const recargar = useCallback(() => {
    setCargando(true);
    setError(null);
    return cargar();
  }, [cargar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!respondiendo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRespondiendo(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [respondiendo]);

  const { promedio, total } = useMemo(() => {
    if (resenas.length === 0) return { promedio: 0, total: 0 };
    const suma = resenas.reduce((acc, r) => acc + (Number.isFinite(r.estrellas) ? r.estrellas : 0), 0);
    return { promedio: suma / resenas.length, total: resenas.length };
  }, [resenas]);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    if (!respondiendo || !texto.trim()) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/resenas/${respondiendo.id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ respuesta: texto.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setResenas((prev) =>
        prev.map((r) => (r.id === respondiendo.id ? { ...r, respuesta: texto.trim() } : r))
      );
      setToast('Respuesta publicada.');
      setRespondiendo(null);
      setTexto('');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'No se pudo responder.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div>
        <p className="text-[11px] font-bold tracking-[0.14em] text-alerta-hondo">⭐ RESEÑAS</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-basalto">
          Reseñas de tus canchas
        </h1>
        <p className="mt-1 text-sm text-pizarra">
          Lo que dicen tus jugadores después de jugar. Responde y gana su confianza.
        </p>
      </div>

      {toast && (
        <p role="status" className="mt-4 rounded-xl border-2 border-basalto bg-tiza px-4 py-3 text-sm font-semibold text-basalto shadow-dura-sm">
          {toast}
        </p>
      )}

      {/* Resumen */}
      <div className="card-tactil mt-4 p-5">
        {cargando ? (
          <p className="text-sm text-pizarra">Cargando resumen…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-4xl font-black text-basalto">
                {total > 0 ? promedio.toFixed(1) : '—'}
              </p>
              <div className="mt-1">
                <Estrellas n={promedio} />
              </div>
              <p className="mt-1 text-xs text-pizarra">
                {total > 0 ? `${total} reseña${total === 1 ? '' : 's'} en total` : 'Sin calificaciones aún'}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-basalto">Tu reputación</p>
              <p className="mt-0.5 text-sm text-pizarra">
                {total === 0
                  ? 'Cuando recibas tus primeras reseñas verás aquí tu promedio.'
                  : promedio >= 4.5
                    ? 'Excelente: tus jugadores te recomiendan.'
                    : promedio >= 3.5
                      ? 'Bien: responde las reseñas para seguir subiendo.'
                      : 'Responde cada reseña: eso mejora tu imagen.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="mt-4 space-y-3">
        {cargando ? (
          <div className="card-tactil p-6">
            <p className="text-center text-sm text-pizarra">Cargando reseñas…</p>
          </div>
        ) : error ? (
          <div className="card-tactil p-8 text-center">
            <p className="text-sm font-semibold text-basalto">{error}</p>
            <button
              type="button"
              onClick={() => void recargar()}
              className="btn-tactil mt-3 rounded-full border-2 border-basalto bg-tiza px-4 py-2 text-sm font-bold text-basalto hover:bg-piedra"
            >
              Reintentar
            </button>
          </div>
        ) : resenas.length === 0 ? (
          <div className="card-tactil overflow-hidden">
            <EmptyState
              icon={Star}
              title="Sin reseñas aún…"
              description="Comparte tu página con tus jugadores para recibir las primeras valoraciones de tus canchas."
              action={
                <a
                  href="/admin/complejos"
                  className="btn-tactil rounded-full bg-cesped px-4 py-2.5 text-sm font-bold text-tiza transition-all hover:bg-cesped-hover"
                >
                  Compartir mi página
                </a>
              }
            />
          </div>
        ) : (
          resenas.map((r) => (
            <article key={r.id} className="card-tactil p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Estrellas n={r.estrellas} />
                <time className="text-xs text-pizarra">{fechaCorta(r.fecha)}</time>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-basalto">{r.comentario || 'Sin comentario.'}</p>
              <p className="mt-2 text-xs font-semibold text-pizarra">— {r.jugador}</p>
              {r.respuesta ? (
                <div className="mt-3 rounded-xl border-2 border-cal bg-sillar p-3">
                  <p className="text-[11px] font-bold tracking-wide text-cesped-hondo">TU RESPUESTA</p>
                  <p className="mt-1 text-sm text-basalto">{r.respuesta}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRespondiendo(r);
                    setTexto('');
                  }}
                  className="btn-tactil mt-3 inline-flex items-center gap-1.5 border-2 border-basalto bg-tiza px-3 py-2 text-sm font-bold text-basalto hover:bg-piedra hover:text-cesped-hondo"
                >
                  <MessageCircleReply size={16} strokeWidth={2} /> Responder
                </button>
              )}
            </article>
          ))
        )}
      </div>

      {/* Modal responder */}
      {respondiendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo p-4" role="dialog" aria-modal="true" aria-label="Responder reseña">
          <form
            onSubmit={(e) => void responder(e)}
            className="w-full max-w-md rounded-2xl border-2 border-basalto bg-tiza p-6 shadow-dura-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-alerta-hondo">RESEÑA</p>
                <h2 className="mt-1 text-xl font-black text-basalto">Responder a {respondiendo.jugador}</h2>
              </div>
              <button
                type="button"
                onClick={() => setRespondiendo(null)}
                aria-label="Cerrar"
                className="btn-tactil h-11 w-11 rounded-full border-2 border-basalto bg-tiza p-1.5 text-pizarra hover:text-basalto hover:bg-piedra"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <blockquote className="mt-3 rounded-xl border-2 border-cal bg-sillar p-3 text-sm text-pizarra">
              “{respondiendo.comentario || 'Sin comentario.'}”
            </blockquote>
            <label className="mt-3 block text-sm font-semibold text-basalto">
              Tu respuesta
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                placeholder="Ej. ¡Gracias por jugar con nosotros! Te esperamos pronto."
                className="mt-1.5 w-full rounded-xl border-2 border-basalto bg-tiza px-3 py-2.5 text-sm font-normal text-basalto placeholder:text-pizarra focus:border-cesped focus:outline-none focus:ring-2 focus:ring-cesped/25"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRespondiendo(null)}
                className="btn-tactil flex-1 border-2 border-basalto bg-tiza px-4 py-2.5 text-sm font-bold text-basalto hover:bg-piedra"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                className="btn-tactil flex-1 bg-cesped px-4 py-2.5 text-sm font-bold text-tiza hover:bg-cesped-hover disabled:opacity-50"
              >
                {enviando ? 'Publicando…' : 'Publicar respuesta'}
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] text-pizarra">
              POST /api/resenas/{respondiendo.id}/responder
            </p>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
