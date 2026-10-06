import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Recupera tu contraseña | ReservaYa", "Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.", "/forgot-password", "noindex, follow")

export default function Page() { return <PublicContent /> }
