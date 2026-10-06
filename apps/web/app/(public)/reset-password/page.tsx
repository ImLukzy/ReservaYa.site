import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Crea una nueva contraseña | ReservaYa", "Elige una contraseña nueva para tu cuenta de ReservaYa.", "/reset-password", "noindex, nofollow")

export default function Page() { return <PublicContent /> }
