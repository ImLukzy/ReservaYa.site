import Link from 'next/link';

interface MarcaProps {
  href?: string;
  className?: string;
  textColor?: string;
}

export function Marca({ href = '/', className = '', textColor = 'text-basalto' }: MarcaProps) {
  const content = (
    <span className={`inline-flex min-h-11 items-center gap-2 ${className}`.trim()} aria-label="ReservaYa, inicio">
      <svg
        className="h-8 w-8 shrink-0 text-cesped"
        viewBox="0 0 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="22" height="18" rx="2" />
        <path d="M14 5v18" />
        <circle cx="14" cy="14" r="3.5" />
      </svg>
      <span className={`font-display text-2xl font-extrabold tracking-tight leading-none ${textColor}`}>
        ReservaYa
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }
  return content;
}
