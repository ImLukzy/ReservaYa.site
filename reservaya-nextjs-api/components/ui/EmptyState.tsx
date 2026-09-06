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
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Icon className="mb-4 h-16 w-16 text-[#CBD5E1]" strokeWidth={1.25} />
      <p className="text-lg font-medium text-[#334155]">{title}</p>
      <p className="mb-6 mt-1 max-w-sm text-sm text-[#64748B]">{description}</p>
      {action}
    </div>
  );
}
