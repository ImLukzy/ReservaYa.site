import Image from "next/image";
import SeccionTitulo from "./SeccionTitulo";

interface Accion {
  href: string;
  texto: string;
  externo?: boolean;
}
interface Props {
  id: string;
  antetitulo?: string;
  titulo: string;
  bajada: string;
  primario: Accion;
  secundario?: Accion;
  /** Foto de /img/hero (sin extensión). Sin foto: fondo de noche de cancha. */
  foto?: string;
}

// Banda de cierre (spec 54): foto con velo de noche a la izquierda, texto alineado a la izquierda,
// acción principal en verde de reflector y secundaria con borde claro.
export default function BandaCierre(props: Props) {
  const { id, antetitulo, titulo, bajada, primario, secundario, foto } = props;
  const externo = (a: Accion) => (a.externo ? { target: "_blank", rel: "noopener" } : {});
  return <section aria-labelledby={id} className="banda-foto">
    {foto && <Image src={`/img/hero/${foto}.webp`} alt="" fill sizes="100vw" className="banda-foto__img object-cover" />}
    <div className="revelar mx-auto flex min-h-[24rem] max-w-page flex-col justify-center px-4 py-16 md:px-6 lg:py-24">
      <SeccionTitulo id={id} alinear="izquierda" tono="oscuro" antetitulo={antetitulo} titulo={titulo} bajada={bajada} />
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={primario.href} {...externo(primario)} className="btn-tactil min-h-11 bg-reflector px-6 text-sm text-cancha-noche hover:bg-cesped-hover">{primario.texto}</a>
        {secundario && <a href={secundario.href} {...externo(secundario)} className="btn-tactil min-h-11 border-blanco/60 bg-transparent px-6 text-sm text-blanco shadow-none hover:border-blanco hover:bg-blanco/10">{secundario.texto}</a>}
      </div>
    </div>
  </section>;
}
