import type { ReactNode } from "react"

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <section className="mx-auto max-w-texto px-4 py-8 md:px-6 lg:py-12"><div className="card-tactil p-6 md:p-10">{children}</div></section>
}
