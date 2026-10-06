// Silueta de un solo trazo: Chachani a la izquierda, Misti al centro, Pichu Pichu a la derecha (spec 54).
// Decorativa; el color sale de currentColor.
export default function Misti({ className = "misti" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 1200 140" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path vectorEffect="non-scaling-stroke" d="M0 132 C60 128 110 118 160 104 L210 92 L240 98 L280 76 L318 84 L352 64 L390 80 L430 72 L480 96 L540 112 L585 104 L640 70 L700 26 Q712 18 726 17 L770 17 Q784 18 796 26 L860 72 L915 106 L960 100 L1000 84 L1030 90 L1062 74 L1092 86 L1120 80 L1160 100 L1200 108" />
  </svg>
}
