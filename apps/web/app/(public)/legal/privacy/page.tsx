import Link from "next/link";
import { publicMetadata } from "@/lib/public/metadata";
import { EMPRESA, ACTUALIZACION_LEGAL } from "@/lib/public/empresa";

export const metadata = publicMetadata("Política de privacidad | ReservaYa", "Tratamiento de datos personales, cookies y derechos en ReservaYa.", "/legal/privacy");

export default function Page() { return <article className="prosa">
<h1>Política de privacidad</h1>
<p>Última actualización: {ACTUALIZACION_LEGAL}.</p>
<h2>1. Contacto para privacidad</h2>
<p>Contacto para privacidad: <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a>.</p>
<p>El tratamiento se sujeta a la Ley N.º 29733 y al reglamento aprobado por el D.S. N.º 016-2024-JUS.</p>
<h2>2. Datos tratados y finalidades</h2>
<ul>
<li>Cuenta: nombre, correo, fecha de nacimiento, nombre de usuario y, cuando los proporcionas, teléfono y foto; para identificarte, permitir el acceso y gestionar tu cuenta.</li>
<li>Reservas y participación en partidos: para tramitar solicitudes, comunicar su estado y facilitar la coordinación con el complejo y los participantes.</li>
<li>Consultas, sugerencias y reclamaciones: datos de contacto, identificación y contenido que aportes, para responder y atender las obligaciones aplicables.</li>
<li>Datos técnicos y de uso: para mantener la seguridad y el funcionamiento del sitio; la analítica de navegación depende de que Google Analytics esté configurado.</li>
</ul>
<p>Los datos requeridos en cada formulario son necesarios para tramitar esa solicitud. No incluyas datos sensibles ni información de terceros que no sea necesaria o que no estés autorizado a comunicar.</p>
<h2>3. Base legal y consentimiento</h2>
<p>Los datos necesarios para preparar o ejecutar la relación contractual y cumplir obligaciones legales se tratan en los supuestos permitidos por la ley. Para las finalidades que requieran consentimiento, este debe ser previo, informado, expreso e inequívoco; la navegación o la aceptación de términos no lo sustituye.</p>
<p>Puedes retirar tu consentimiento mediante el correo indicado, sin afectar el tratamiento anterior lícito ni las obligaciones legales de conservación.</p>
<h2>4. Conservación y seguridad</h2>
<p>Los datos se conservan durante el tiempo necesario para la finalidad correspondiente y, después, por los plazos legales o para atender responsabilidades pendientes. Cumplidos esos plazos, corresponde eliminarlos o anonimizarlos; puedes solicitar información sobre la conservación de tus datos.</p>
<p>El acceso a la información debe limitarse a las personas autorizadas y aplicarse medidas de seguridad acordes con su naturaleza y los riesgos del tratamiento.</p>
<h2>5. Destinatarios y transferencias</h2>
<p>El complejo recibe la información necesaria para atender la reserva. Los proveedores de alojamiento y base de datos, correo y recepción de mensajes pueden tratar información para prestar esos servicios. Si se configura Google Analytics, Google recibe datos técnicos y de navegación.</p>
<p>Estos servicios pueden implicar tratamiento fuera del Perú. Las transferencias deben cumplir las garantías e información exigidas por la normativa peruana; puedes solicitar la identificación de los destinatarios y países aplicables al correo de privacidad.</p>
<h2>6. Cookies y analítica</h2>
<p>La cookie de sesión permite mantener el acceso a tu cuenta. Puedes eliminarla o bloquearla en el navegador, aunque entonces no podrás mantener la sesión.</p>
<p>Google Analytics solo se carga si está configurado y aceptas las cookies de análisis en el aviso. Si rechazas o todavía no eliges, no se carga; tampoco se activa en la recuperación de contraseña. Puedes cambiar tu decisión desde «Preferencias de cookies» en el pie.</p>
<p>La elección se guarda en el almacenamiento local del navegador. Si este lo impide, se mantiene únicamente mientras la página permanece abierta; las cookies necesarias de sesión no dependen de esta elección.</p>
<h2>7. Derechos ARCO</h2>
<p>Puedes ejercer los derechos de acceso, rectificación, cancelación y oposición (ARCO), así como retirar el consentimiento y ejercer otros derechos reconocidos por la normativa. Escribe a <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a> con el asunto «Datos personales», indica el derecho que solicitas y los datos necesarios para identificarte y responder.</p>
<p>Podrá solicitarse una verificación proporcional de identidad o de representación por un canal adecuado. La solicitud se atenderá dentro de los plazos legales; si no recibes atención o discrepas con la respuesta, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</p>
<h2>8. Menores de edad</h2>
<p>La edad mínima de registro es de 14 años, tanto con correo como con Google. Se bloquea el registro de menores de 14 años porque no se implementa el consentimiento de padres o tutores exigido para tratar sus datos. Las personas de 14 a 17 años deben respetar las reglas de capacidad y representación aplicables a la contratación de servicios.</p>
<h2>9. Cambios y canales de atención</h2>
<p>Las modificaciones se publican con su fecha de actualización. Una nueva finalidad que requiera consentimiento deberá informarse y autorizarse antes de aplicarse.</p>
<p>Consulta los <Link href="/legal/terms">Términos de uso</Link>. Para quejas o reclamos sobre el servicio utiliza el <Link href="/libro-reclamaciones">Libro de reclamaciones</Link>.</p>
</article>; }
