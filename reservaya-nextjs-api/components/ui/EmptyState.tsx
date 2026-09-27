import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cal p-12 text-center">
      <Icon className="mb-4 h-12 w-12 text-borde" strokeWidth={1.5} aria-hidden="true" />
      <p className="font-display text-xl font-semibold text-basalto">{title}</p>
      <p className="mb-6 mt-1 max-w-sm text-sm text-pizarra">{description}</p>
      {action}
    </div>
  );
}
