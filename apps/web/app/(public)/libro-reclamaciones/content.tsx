"use client";
import { useEffect, useState } from "react";
import { createScriptScope } from "@/lib/public/runtime";
import { Input as Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EMAIL } from "@/lib/public/contacto";
import Link from "next/link";
import { EMPRESA, ACTUALIZACION_LEGAL } from "@/lib/public/empresa";
import { textoReclamacion, payloadReclamacion, type ConstanciaReclamo } from "@/lib/public/reclamaciones";
import { AVISO } from "@/lib/public/estilos";
const tipos = [
    { valor: "Queja", etiqueta: "Queja" },
    { valor: "Reclamo", etiqueta: "Reclamo" },
];
const clases = AVISO;
export default function PublicContent() {
    const [menor, setMenor] = useState(false);
    useEffect(() => {
        const scope = createScriptScope();
        const listen = scope.listen;
        const fetch = scope.request;

        (function () {
            const form = document.querySelector<HTMLFormElement>("form[data-libro-reclamaciones]");
            if (!form)
                return;
            listen(form, "submit", async function (e) {
                e.preventDefault();
                const status = form.querySelector<HTMLElement>("[data-status]");
                if (!form.checkValidity()) { form.reportValidity(); return; }
                const data = new FormData(form);
                data.set("fecha", new Date().toISOString());
                const nombre = String(data.get("nombre") || "").trim();
                const email = String(data.get("email") || "").trim();
                const detalle = String(data.get("detalle") || "").trim();
                const pedido = String(data.get("pedido") || "").trim();
                function msg(t: string, ok = false) {
                    if (!status)
                        return;
                    status.textContent = t;
                    status.className = ok ? clases.ok : clases.error;
                    status.hidden = false;
                }
                if (nombre.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || detalle.length < 10 || pedido.length < 5) {
                    msg("Revisa los datos: nombre, correo válido, qué pasó (mínimo 10 caracteres) y qué pides.");
                    return;
                }
                const payload = Object.fromEntries(data.entries());
                const copia = form.querySelector<HTMLAnchorElement>("[data-copia]");
                const constancia = form.querySelector<HTMLElement>("[data-constancia]");
                const boton = form.querySelector<HTMLButtonElement>("[data-submit]");
                if (boton?.disabled) return;
                if (copia) copia.hidden = true;
                if (constancia) constancia.hidden = true;
                if (boton) boton.disabled = true;
                try {
                    const response = await fetch("/api/reclamos", { method: "POST", body: JSON.stringify(payloadReclamacion(payload)) });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result?.error || "No se pudo registrar el reclamo.");
                    if (!result?.numero || !result?.fecha || result?.ok !== true) throw new Error("No se recibió la constancia. Contacta a ReservaYa antes de volver a enviar.");
                    const recibo = result as ConstanciaReclamo;
                    data.set("fecha", recibo.fecha);
                    const body = textoReclamacion(Object.fromEntries(data.entries()), recibo);
                    if (constancia) {
                        constancia.textContent = body;
                        constancia.hidden = false;
                    }
                    if (copia) {
                        copia.href = "data:text/plain;charset=utf-8," + encodeURIComponent(body);
                        copia.download = `reclamo-${recibo.numero}.txt`;
                        copia.hidden = false;
                    }
                    msg(`Registrado con el número ${recibo.numero}. Guarda tu constancia. Responderemos por el medio elegido en un máximo de 15 días hábiles.`, true);
                    // Una nueva solicitud exige recargar la página: evita doble clic tras el éxito.
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                    msg(error instanceof Error ? error.message : "No se pudo confirmar el registro. Inténtalo nuevamente.");
                    if (boton) boton.disabled = false;
                }
            });
        })();
        return scope.dispose;
    }, []);
    return (<>


    <>
  <section className="mx-auto max-w-texto px-4 pb-16 pt-8 md:px-6 lg:pt-12">
    <div className="flex items-center gap-2">
      <span className="font-display text-xs font-bold uppercase tracking-wider text-cesped-hondo">Atención al usuario</span>
      <span className="text-xs text-pizarra">·</span>
      <span className="font-display text-xs font-bold uppercase tracking-wider text-pizarra">Canal formal</span>
    </div>
    <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-basalto sm:text-5xl">Libro de reclamaciones</h1>
    <p className="mt-3 max-w-2xl text-base leading-relaxed text-pizarra sm:text-lg">Presenta tu queja o reclamo sobre ReservaYa. El plazo máximo de respuesta es de 15 días hábiles improrrogables desde su recepción, conforme a la Ley N.º 29571 y al D.S. N.º 011-2011-PCM y sus modificatorias.</p>

    <div className="mt-6 text-sm text-pizarra">
      <p><strong>Contacto:</strong> <a href={`mailto:${EMPRESA.email}`} className="inline-block min-h-11 min-w-11 py-3 -my-3 underline">{EMPRESA.email}</a></p>
      <p className="mt-2">Última actualización: {ACTUALIZACION_LEGAL}.</p>
    </div>
    <form data-libro-reclamaciones className="card-tactil mt-8 space-y-4 bg-tiza p-5 shadow-suave sm:p-7" noValidate>
      <div className="border-b border-cal pb-3">
        <p className="font-display text-xl font-black text-basalto">Cuéntanos qué ocurrió</p>
        <p className="mt-1 text-sm text-pizarra">Completa los datos del consumidor y del producto o servicio. Al registrarlo recibirás un número y una copia de tu solicitud.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field apariencia="publica" id="lr-nombre" name="nombre" etiqueta="Nombre completo" required autoComplete="name"/>
        <Field apariencia="publica" id="lr-email" name="email" type="email" etiqueta="Correo" required autoComplete="email" placeholder="tu@correo.com"/>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select apariencia="publica" id="lr-documento-tipo" name="documentoTipo" etiqueta="Documento de identidad" opciones={[{ valor: "DNI", etiqueta: "DNI" }, { valor: "CE", etiqueta: "Carné de extranjería" }]}/>
        <Field apariencia="publica" id="lr-documento" name="documento" etiqueta="Número de documento" required minLength={6} maxLength={20}/>
        <Field apariencia="publica" id="lr-domicilio" name="domicilio" etiqueta="Domicilio" required autoComplete="street-address"/>
        <Field apariencia="publica" id="lr-telefono" name="telefono" etiqueta="Teléfono" type="tel" required autoComplete="tel" minLength={6}/>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-pizarra" htmlFor="lr-menor">
        <input id="lr-menor" name="menor" type="checkbox" value="Sí" checked={menor} onChange={e => setMenor(e.target.checked)} />El consumidor es menor de edad
      </label>
      {menor && <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-bold text-basalto">Padre, madre o representante</legend>
        <Field apariencia="publica" id="lr-apoderado" name="apoderado" etiqueta="Nombre completo del representante" required/>
        <Field apariencia="publica" id="lr-apoderado-documento" name="apoderadoDocumento" etiqueta="DNI o CE del representante" required minLength={6} maxLength={20}/>
        <Field apariencia="publica" id="lr-apoderado-domicilio" name="apoderadoDomicilio" etiqueta="Domicilio del representante" required/>
        <Field apariencia="publica" id="lr-apoderado-telefono" name="apoderadoTelefono" etiqueta="Teléfono del representante" type="tel" required/>
      </fieldset>}
      <Select apariencia="publica" id="lr-bien-tipo" name="bienTipo" etiqueta="Bien contratado" opciones={[{ valor: "Servicio", etiqueta: "Servicio" }, { valor: "Producto", etiqueta: "Producto" }]}/>
      <Field apariencia="publica" id="lr-bien" name="bienDescripcion" etiqueta="Descripción del producto o servicio" required/>
      <Field apariencia="publica" id="lr-monto" name="monto" etiqueta="Monto reclamado en soles (opcional)" type="number" min="0" step="0.01"/>
      <Select apariencia="publica" id="lr-respuesta" name="respuesta" etiqueta="Medio para recibir la respuesta" opciones={[{ valor: "Correo electrónico", etiqueta: "Correo electrónico" }, { valor: "Carta al domicilio", etiqueta: "Carta al domicilio indicado" }]}/>
      <Select apariencia="publica" id="lr-tipo" name="tipo" etiqueta="Tipo" opciones={tipos}/>
      <p className="text-sm text-pizarra">Queja: malestar por la atención. Reclamo: desacuerdo con el servicio o el cobro.</p>
      <Field apariencia="publica" id="lr-detalle" name="detalle" etiqueta="Qué pasó" multilinea filas={5} required minLength={10} placeholder="Fecha, complejo y lo que ocurrió."/>
      <Field apariencia="publica" id="lr-pedido" name="pedido" etiqueta="Qué pides" multilinea filas={3} required minLength={5}/>
      <p className="text-sm text-pizarra">La presentación es gratuita y no impide acudir al Indecopi. Los datos se utilizan para atender esta solicitud conforme a la <Link href="/legal/privacy" className="inline-block min-h-11 min-w-11 py-3 -my-3 underline">Política de privacidad</Link>.</p>
      <p data-status hidden role="status"></p>
      <pre data-constancia hidden aria-label="Constancia del reclamo" className="whitespace-pre-wrap break-words text-sm text-pizarra"></pre>
      <a data-copia hidden download="solicitud-reclamacion-reservaya.txt" className="inline-flex min-h-11 items-center font-semibold text-cesped-hondo underline">Descargar constancia</a>
      <Button apariencia="publica" type="submit" data-submit className="w-full shadow-suave-sm">Enviar reclamo</Button>
      <p className="text-center text-sm text-pizarra">También puedes escribir a <a href={`mailto:${EMAIL}`} className="inline-block min-h-11 min-w-11 py-3 -my-3 font-semibold text-cesped-hondo underline">{EMAIL}</a>.</p>
    </form>
  </section>
    </>



    </>);
}
