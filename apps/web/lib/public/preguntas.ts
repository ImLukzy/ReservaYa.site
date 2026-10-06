// Una fuente de preguntas públicas; cada página resuelve dudas distintas.
export const PREGUNTAS_JUGADOR = [
  { categoria: "Cuenta", icono: "usuario", pregunta: "¿Necesito cuenta para reservar?", respuesta: "Sí, necesitas una cuenta para enviar una reserva y consultar su estado. Si todavía no tienes una, puedes crearla desde Registrarse en la cabecera." },
  { categoria: "Reservas", icono: "reloj", pregunta: "¿Cuándo se confirma mi reserva?", respuesta: "El complejo debe aceptar tu solicitud; enviarla no significa que ya esté confirmada. Cuando la confirma, ves el código en Mi partido y lo muestras al llegar." },
  { categoria: "Pagos", icono: "billete", pregunta: "¿Dónde pago la reserva?", respuesta: "El pago se coordina directamente con el complejo; ReservaYa no lo cobra en la página. Consulta con el complejo el método de pago antes de jugar." },
  { categoria: "Distritos", icono: "lugar", pregunta: "¿En qué zonas puedo buscar?", respuesta: "El buscador incluye los 29 distritos de Arequipa. Las canchas disponibles dependen de los complejos publicados; elige un distrito para ver las opciones de tu zona." },
  { categoria: "Privacidad", icono: "ok", pregunta: "¿Cómo decido sobre las cookies de análisis?", respuesta: "Puedes aceptar o rechazar el análisis en el aviso de cookies. Si quieres cambiar tu elección después, abre las preferencias de cookies desde el pie de página." },
] as const;

export const PREGUNTAS_AYUDA = [
  { categoria: "Búsqueda", icono: "buscar", pregunta: "¿Cómo encuentro una cancha libre?", respuesta: "Filtra por distrito, deporte y día en Canchas. Revisa las horas disponibles y sus precios antes de reservar; también puedes buscar por nombre del complejo o de la cancha." },
  { categoria: "Reservas", icono: "calendario", pregunta: "¿Para qué días puedo buscar?", respuesta: "Puedes buscar para hoy o mañana, según los horarios publicados por cada complejo. Cambia el día en el buscador y revisa de nuevo las horas libres." },
  { categoria: "Partidos", icono: "grupo", pregunta: "¿Qué hago si me faltan jugadores?", respuesta: "En Jugar, abre Partidos abiertos para sumarte a una convocatoria o publicar la tuya. Revisa sus cupos y nivel; la organización la coordinan los participantes." },
  { categoria: "Acceso", icono: "usuario", pregunta: "¿Cómo recupero mi contraseña?", respuesta: "Desde Iniciar sesión, abre la opción de recuperar contraseña y escribe tu correo. El enlace que recibas te permite crear una nueva contraseña; si ya venció, solicita otro." },
] as const;

export const PREGUNTAS_EQUIPOS = [
  { categoria: "Reparto", icono: "mezclar", pregunta: "¿Cómo se reparten los equipos?", respuesta: "Los jugadores se mezclan al azar en dos, tres o cuatro equipos. Si no se dividen exacto, algunos equipos tendrán una persona más. Elige cuántos equipos quieres antes de pulsar Sortear equipos." },
  { categoria: "Invitados", icono: "mas", pregunta: "¿Cómo agrego jugadores sin cuenta?", respuesta: "Usa Agregar invitado sin cuenta y escribe los nombres separados por comas. Puedes quitar jugadores antes de sortear; revisa la lista para que participen quienes van a jugar." },
  { categoria: "Resultado", icono: "copiar", pregunta: "¿Cómo comparto el resultado?", respuesta: "Pulsa Copiar en la tarjeta de cada equipo y pega el texto en el chat de tu grupo. El botón indica si se copió o si el navegador no lo permitió." },
  { categoria: "Jugadores", icono: "grupo", pregunta: "¿Cuántos jugadores necesito para sortear?", respuesta: "Agrega al menos dos jugadores para activar Sortear equipos. El contador de la lista te permite comprobar cuántos has incluido antes de repartirlos." },
] as const;

export const PREGUNTAS_DUENO = [
  { categoria: "Cobros", icono: "billete", pregunta: "¿ReservaYa cobra las reservas por mí?", respuesta: "No, tú recibes el pago y lo registras en la caja del panel con su método. Así queda registrado el cobro que gestionaste directamente con el jugador." },
  { categoria: "Sedes", icono: "lugar", pregunta: "¿Puedo gestionar varias sedes?", respuesta: "Con una suscripción activa puedes gestionar varios complejos, con sus propias canchas, horarios, precios y trabajadores. La prueba gratis está limitada a un complejo con una cancha; revisa Planes y precios antes de ampliarlo." },
  { categoria: "Reservas", icono: "reloj", pregunta: "¿Cómo atiendo una reserva pendiente?", respuesta: "Revísala en el panel y confírmala o recházala. Mientras siga pendiente, no bloquea el horario; comprueba la disponibilidad antes de confirmarla." },
  { categoria: "Trabajadores", icono: "grupo", pregunta: "¿Qué acceso tienen mis trabajadores?", respuesta: "Entran con su propia cuenta a la agenda, las reservas y la caja. No ven tus reportes ni tus ingresos; cada trabajador usa su propio acceso." },
  { categoria: "Inicio", icono: "ok", pregunta: "¿Cómo empieza la prueba de dueño?", respuesta: "Crea tu cuenta y, desde tu panel, envía tu centro con una cancha aceptando el convenio. Lo revisamos y, al aprobarlo, la prueba de 30 días empieza ese día, con máximo una cancha. Al vencer necesitas una suscripción activa; sin ella, la cancha deja de recibir reservas y el panel solo permite solicitar la suscripción." },
] as const;
