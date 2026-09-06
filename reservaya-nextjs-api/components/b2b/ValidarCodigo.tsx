'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleCheck, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ValidarCodigo() {
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [restriccion, setRestriccion] = useState<{ nivel: string; motivo: string } | null>(null);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Foco automático + re-foco tras validar (lector QR express).
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function limpiarAuto() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCodigo('');
      setEstado('idle');
      setMsg('');
      setRestriccion(null);
      inputRef.current?.focus();
    }, 2200);
  }

  async function validar(raw: string) {
    const value = raw.trim().toUpperCase();
    if (value.length < 3) return;
    setRestriccion(null);
    try {
      const res = await fetch('/api/reservas/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ codigo: value }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Código no válido');
      setEstado('ok');
      setMsg(`Ingreso confirmado · ${body?.reserva?.cancha ?? value}`);
      setRestriccion(body?.reserva?.restriccion ?? null);
      setFlash(true);
      setTimeout(() => setFlash(false), 650);
      limpiarAuto();
    } catch (e) {
      setEstado('error');
      setMsg(e instanceof Error ? e.message : 'No se pudo validar');
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div
        className={cn(
          'w-full max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]',
          flash && 'flash-green'
        )}
      >
        {estado === 'ok' ? (
          <CircleCheck className="mx-auto mb-4 h-16 w-16 text-[#22C55E]" strokeWidth={1.75} />
        ) : (
          <ScanLine className="mx-auto mb-4 h-16 w-16 text-[#CBD5E1]" strokeWidth={1.25} />
        )}
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Validar código</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-[#475569]">
          Listo para escanear QR o tipea el código de 6 dígitos
        </p>
        <input
          ref={inputRef}
          value={codigo}
          onChange={(e) => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
            setCodigo(v);
            setEstado('idle');
            if (v.replace('-', '').length >= 6) void validar(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void validar(codigo);
          }}
          placeholder="RF-8K2P"
          autoComplete="off"
          spellCheck={false}
          aria-label="Código de reserva"
          className="mt-6 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-center font-mono text-5xl tracking-[0.2em] text-[#0F172A] uppercase transition-all outline-none placeholder:text-[#CBD5E1] focus:border-[#22C55E] focus:bg-white focus:ring-4 focus:ring-[#22C55E]/20"
        />
          {msg && (
            <p
              role={estado === 'ok' ? 'status' : 'alert'}
              className={cn(
                'mt-4 rounded-lg px-4 py-3 text-sm font-semibold',
                estado === 'ok' ? 'bg-[#DCFCE7] text-[#008F3B]' : 'bg-red-50 text-red-700'
              )}
            >
              {msg}
            </p>
          )}
          {restriccion && (
            <p
              role="alert"
              className={cn(
                'mt-2 rounded-lg px-4 py-3 text-sm font-bold',
                restriccion.nivel === 'BLOQUEO' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
              )}
            >
              {restriccion.nivel === 'BLOQUEO' ? '⛔ NO PERMITIR EL INGRESO' : '⚠️ Jugador con advertencia'} ·{' '}
              {restriccion.motivo}
            </p>
          )}
      </div>
    </div>
  );
}
