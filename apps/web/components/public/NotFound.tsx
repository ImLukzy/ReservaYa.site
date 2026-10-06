import { Button } from "@/components/ui/Button";
import { CroquisCancha } from "@/components/ui/CroquisCancha";

export default function NotFound() {
  return <section className="mx-auto max-w-texto px-4 py-16 md:px-6 lg:py-24">
    <div className="card-tactil p-8 text-center sm:p-12">
      <CroquisCancha apariencia="publica" className="mx-auto mb-4 h-32 w-full max-w-xs" />
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-basalto lg:text-4xl">No encontramos esta página</h1>
      <p className="mx-auto mt-3 max-w-md text-lg text-pizarra">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button apariencia="publica" href="/canchas">Buscar canchas</Button>
        <Button apariencia="publica" href="/" variante="secundario">Ir al inicio</Button>
      </div>
    </div>
  </section>
}
