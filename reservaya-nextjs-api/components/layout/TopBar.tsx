'use client';

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
    <div className="sticky top-0 z-20 -mx-4 border-b border-[#E2E8F0] bg-[#F8F9FA]/90 py-3 pl-14 pr-4 backdrop-blur sm:-mx-6 sm:pr-6 md:-mx-8 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-[#64748B]">{breadcrumb}</p>
          {title && (
            <h1 className="truncate text-xl font-bold tracking-tight text-[#0F172A] sm:text-[28px]">{title}</h1>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
