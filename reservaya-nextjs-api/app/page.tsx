import { redirect } from 'next/navigation'

// La portada pública vive en el landing (Astro). La raíz del panel lleva al
// login: redirigir a la propia URL causaba bucle infinito.
export default function HomePage() {
  redirect('/login')
}