'use client';

import { Bell, CircleHelp } from 'lucide-react';

export function TopBar({
  breadcrumb,
  title,
  action,
}: {
  breadcrumb: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-[#E2E8F0] bg-[#F8F9FA]/90 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-[#64748B]">{breadcrumb}</p>
          {title && (
            <h1 className="truncate text-[28px] font-bold tracking-tight text-[#0F172A]">{title}</h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button
            type="button"
            aria-label="Tutoriales"
            title="Tutoriales guiados"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-sm font-bold text-[#64748B] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
          >
            <CircleHelp size={18} strokeWidth={1.85} />
          </button>
          <button
            type="button"
            aria-label="Notificaciones"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
          >
            <Bell size={18} strokeWidth={1.85} />
          </button>
        </div>
      </div>
    </div>
  );
}
