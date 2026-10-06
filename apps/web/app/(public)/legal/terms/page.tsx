import Link from "next/link";
import { publicMetadata } from "@/lib/public/metadata";
import { EMPRESA, ACTUALIZACION_LEGAL } from "@/lib/public/empresa";

export const metadata = publicMetadata("Términos de uso | ReservaYa", "Condiciones de uso, reservas y derechos del consumidor en ReservaYa.", "/legal/terms");

export default function Page() { return <article className="prosa">
<h1>Términos y condiciones de uso</h1>
<p>Última actualización: {ACTUALIZACION_LEGAL}.</p>
<h2>1. Contacto</h2>
<p>Contacto: <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a>.</p>
<h2>2. Definiciones y objeto</h2>
<p>La plataforma es el sitio ReservaYa; el usuario es quien lo utiliza; el complejo es el proveedor del servicio deportivo. ReservaYa facilita la búsqueda y la solicitud de reservas como intermediario: cada complejo publica sus precios y horarios, presta el servicio y confirma o rechaza las solicitudes.</p>
<p>Estos términos regulan el uso de la plataforma. La contratación del servicio deportivo se sujeta además a las condiciones informadas por el complejo, sin perjuicio de los derechos reconocidos por la legislación peruana.</p>
<h2>3. Registro, edad y seguridad de la cuenta</h2>
<p>El usuario debe proporcionar datos veraces y mantenerlos actualizados. Debe proteger su contraseña y comunicar accesos no autorizados al correo de contacto; no podrá utilizar cuentas ajenas ni suplantar identidades.</p>
<p>La edad mínima para crear una cuenta es de 14 años. No se admite el registro de menores de 14 años, ya que la plataforma no implementa el consentimiento de sus padres o tutores.</p>
<p>Para contratar por cuenta propia se requiere mayoría de edad (18 años), salvo los supuestos de capacidad previstos por ley. Los menores deberán actuar con la intervención de su representante legal cuando corresponda; el tratamiento de sus datos se explica en la <Link href="/legal/privacy">Política de privacidad</Link>.</p>
<h2>4. Reservas, modificaciones, cancelaciones y pagos</h2>
<p>Una solicitud pendiente no constituye una reserva confirmada ni bloquea el horario. La confirmación corresponde al complejo; el usuario debe consultar el estado y presentar el código de la reserva confirmada al llegar.</p>
<p>El pago se coordina directamente con el complejo. Las modificaciones, cancelaciones y devoluciones se rigen por sus condiciones, que deben informarse antes de contratar y respetar los derechos del consumidor. No se establece aquí una penalidad ni una política de devolución común a todos los complejos.</p>
<h2>Convenio de prueba para dueños</h2>
<p>Para publicar tu centro deportivo envías una solicitud desde tu cuenta y aceptas este convenio y los Términos. Nuestro equipo la revisa: si la aprueba, tu cuenta pasa a ser de dueño y la prueba gratis empieza ese día. La prueba dura un mes, definido como 30 días desde la aprobación, y permite un complejo con máximo una cancha. Si la rechaza, te enviamos el motivo por correo y puedes enviarla de nuevo.</p>
<p>Al terminar la prueba es obligatoria una suscripción activa y vigente para continuar. Si no la tienes, tu cancha queda bloqueada para aparecer en la búsqueda y recibir nuevas reservas, y el panel solo permite solicitar una suscripción. El bloqueo es reversible cuando el equipo técnico aprueba y activa la suscripción solicitada.</p>
<p>Los planes y precios publicados en la página de dueños rigen la solicitud; enviarla no la activa por sí sola. Este bloqueo no cancela reservas ni extingue obligaciones ya adquiridas. Guarda una copia del convenio que aceptas.</p>
<h2>5. Obligaciones y conductas prohibidas</h2>
<p>El usuario debe utilizar la plataforma de buena fe y respetar a los demás participantes. Se prohíben las reservas fraudulentas, la suplantación, el acoso, la publicación de contenido ilícito y cualquier acceso no autorizado, extracción abusiva de datos o interferencia con el servicio.</p>
<h2>6. Suspensión de cuentas</h2>
<p>El titular podrá restringir o suspender el acceso ante incumplimientos de estos términos o riesgos de seguridad, con medidas proporcionales. El usuario podrá solicitar información y revisión mediante el correo de contacto; la suspensión no extingue derechos ni obligaciones ya adquiridos.</p>
<h2>7. Responsabilidad</h2>
<p>Cada complejo responde por la información que publica y por la prestación del servicio deportivo. ReservaYa responde por las obligaciones que le correspondan como operador de la plataforma; la condición de intermediario no excluye responsabilidades exigibles por ley.</p>
<p>La disponibilidad puede verse afectada por mantenimiento o fallos técnicos. Ninguna cláusula limita derechos irrenunciables del consumidor ni excluye responsabilidad por dolo, culpa inexcusable u otros supuestos legalmente exigibles.</p>
<h2>8. Propiedad intelectual</h2>
<p>El software, diseño, marca y contenidos pertenecen a sus respectivos titulares. Su consulta no transfiere derechos de propiedad intelectual ni autoriza su reproducción o explotación fuera de los usos permitidos por ley o por autorización del titular.</p>
<h2>9. Protección al consumidor y reclamaciones</h2>
<p>Se aplica el Código de Protección y Defensa del Consumidor, Ley N.º 29571. El usuario puede presentar quejas o reclamos en el <Link href="/libro-reclamaciones">Libro de reclamaciones</Link>, sin renunciar a acudir al Indecopi u otras autoridades competentes.</p>
<h2>10. Datos personales</h2>
<p>El tratamiento de datos se rige por la Ley N.º 29733 y su reglamento aprobado por el D.S. N.º 016-2024-JUS. Consulta las finalidades, destinatarios y derechos en la <Link href="/legal/privacy">Política de privacidad</Link>.</p>
<h2>11. Modificaciones</h2>
<p>Las actualizaciones se publicarán aquí con su fecha de vigencia. Los cambios no alteran retroactivamente las condiciones de reservas ya contratadas ni sustituyen el consentimiento que deba recabarse para nuevas finalidades de tratamiento.</p>
<h2>12. Ley aplicable, jurisdicción y contacto</h2>
<p>Estos términos se rigen por las leyes del Perú. Las controversias podrán someterse a las autoridades y órganos jurisdiccionales competentes de Arequipa, sin restringir los fueros ni las vías de protección que la ley reconozca al consumidor.</p>
<p>Consultas: <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a>. Las propuestas de mejora pueden enviarse desde <Link href="/mejoras">Sugerencias</Link>.</p>
</article>; }
