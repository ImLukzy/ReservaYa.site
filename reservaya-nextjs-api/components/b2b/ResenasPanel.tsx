'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircleReply, Star, X } from 'lucide-react';
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

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
          className={i <= Math.round(n) ? 'fill-[#EAB308] text-[#EAB308]' : 'fill-[#E7E5E4] text-[#E7E5E4]'}
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

export function ResenasPanel() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<Resena | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/resenas', { credentials: 'include', cache: 'no-store' });
      if (res.status === 404) {
        setResenas([]);
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const body = await res.json().catch(() => null);
      setResenas(parseResenas(body));
    } catch {
      setError('No se pudieron cargar las reseñas. Revisa tu conexión e inténtalo de nuevo.');
      setResenas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#EAB308]">⭐ RESEÑAS</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#0F172A]">
          Reseñas de tus canchas
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Lo que dicen tus jugadores después de jugar. Responde y gana su confianza.
        </p>
      </div>

      {toast && (
        <p role="status" className="mt-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm">
          {toast}
        </p>
      )}

      {/* Resumen */}
      <div className="mt-4 rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {cargando ? (
          <p className="text-sm text-[#64748B]">Cargando resumen…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-4xl font-black text-[#0F172A]">
                {total > 0 ? promedio.toFixed(1) : '—'}
              </p>
              <div className="mt-1">
                <Estrellas n={promedio} />
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                {total > 0 ? `${total} reseña${total === 1 ? '' : 's'} en total` : 'Sin calificaciones aún'}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#0F172A]">Tu reputación</p>
              <p className="mt-0.5 text-sm text-[#64748B]">
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
          <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
            <p className="text-center text-sm text-[#64748B]">Cargando reseñas…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#0F172A]">{error}</p>
            <button
              type="button"
              onClick={() => void cargar()}
              className="mt-3 rounded-xl border border-[#E7E5E4] px-4 py-2 text-sm font-bold text-[#0F172A] hover:border-[#22C55E]"
            >
              Reintentar
            </button>
          </div>
        ) : resenas.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <EmptyState
              icon={Star}
              title="Sin reseñas aún…"
              description="Comparte tu página con tus jugadores para recibir las primeras valoraciones de tus canchas."
              action={
                <a
                  href="/admin/complejos"
                  className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98]"
                >
                  Compartir mi página
                </a>
              }
            />
          </div>
        ) : (
          resenas.map((r) => (
            <article key={r.id} className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Estrellas n={r.estrellas} />
                <time className="text-xs text-[#94A3B8]">{fechaCorta(r.fecha)}</time>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#0F172A]">{r.comentario || 'Sin comentario.'}</p>
              <p className="mt-2 text-xs font-semibold text-[#64748B]">— {r.jugador}</p>
              {r.respuesta ? (
                <div className="mt-3 rounded-xl bg-[#F5F5F3] p-3">
                  <p className="text-[11px] font-bold tracking-wide text-[#15803D]">TU RESPUESTA</p>
                  <p className="mt-1 text-sm text-[#0F172A]">{r.respuesta}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRespondiendo(r);
                    setTexto('');
                  }}
                  className={cn(
                    'mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#E7E5E4] px-3 py-2',
                    'text-sm font-bold text-[#0F172A] transition-colors hover:border-[#22C55E] hover:text-[#15803D]'
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Responder reseña">
          <form
            onSubmit={(e) => void responder(e)}
            className="w-full max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-[#EAB308]">RESEÑA</p>
                <h2 className="mt-1 text-xl font-black text-[#0F172A]">Responder a {respondiendo.jugador}</h2>
              </div>
              <button
                type="button"
                onClick={() => setRespondiendo(null)}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F0EE] hover:text-[#0F172A]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <blockquote className="mt-3 rounded-xl bg-[#F5F5F3] p-3 text-sm text-[#475569]">
              “{respondiendo.comentario || 'Sin comentario.'}”
            </blockquote>
            <label className="mt-3 block text-sm font-semibold text-[#0F172A]">
              Tu respuesta
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                placeholder="Ej. ¡Gracias por jugar con nosotros! Te esperamos pronto."
                className="mt-1.5 w-full rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm font-normal text-[#0F172A] focus:border-[#22C55E] focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRespondiendo(null)}
                className="flex-1 rounded-xl border border-[#E7E5E4] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:border-[#22C55E]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                className="flex-1 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#16A34A] disabled:opacity-50"
              >
                {enviando ? 'Publicando…' : 'Publicar respuesta'}
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] text-[#94A3B8]">
              POST /api/resenas/{respondiendo.id}/responder
            </p>
          </form>
        </div>
      )}

      <WhatsAppFloat />
    </div>
  );
}
