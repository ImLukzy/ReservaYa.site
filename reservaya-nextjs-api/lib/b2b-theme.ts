// ReservaYa · tokens unificados
// Negro verdoso #060C08 · botón verde #22C55E (hover #16A34A)
// Neón texto #4ADE80 · amarillo Torneos #EAB308 · fondo claro #F5F5F3
export const theme = {
  bg: '#F5F5F3',
  card: '#FFFFFF',
  border: '#E7E5E4',
  sidebar: '#060C08',
  accent: '#22C55E',
  accentHover: '#16A34A',
  accentSoft: '#DCFCE7',
  accentText: '#15803D',
  accentNeon: '#4ADE80',
  accentWarn: '#EAB308',
  accentContrast: '#FFFFFF',
  ink: '#101613',
  inkSoft: '#0F172A',
  muted: '#5B6660',
} as const;

export const card =
  'rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]';

export const btnPrimary =
  'rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] hover:shadow-[0_4px_14px_rgba(34,197,94,0.4)] active:scale-[0.98]';

export const btnDark =
  'rounded-xl bg-[#060C08] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#0A1A11] active:scale-[0.98]';

export const btnGhost =
  'rounded-xl border border-[#E7E5E4] bg-white px-4 py-2.5 text-sm font-bold text-[#101613] transition-colors hover:border-[#22C55E]';

export const eyebrow =
  'mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#15803D]';

export const badgeOk =
  'rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#15803D]';

export const badgeBeta =
  'rounded-md bg-[#EAB308]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#EAB308]';
