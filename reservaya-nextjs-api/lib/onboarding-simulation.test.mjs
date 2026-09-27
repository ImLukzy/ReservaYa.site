import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pasosOnboarding } from './onboarding.ts'

// Simulador de datos de negocio para cuenta Dueño A6
const crearComplejo = (id, nombre = 'Complejo Arequipa') => ({ id, nombre, totalCanchas: 0 })
const crearCancha = (id, complejoId, { activa = true, imagen = 'https://img.reservaya.pe/cancha1.webp' } = {}) => ({
  id,
  complejoId,
  activa,
  imagen,
})
const crearHorario = (id, complejoId, { activo = true, diaSemana = 1 } = {}) => ({
  id,
  complejoId,
  diaSemana,
  horaApertura: '08:00',
  horaCierre: '22:00',
  activo,
})

// Especificación de pasos de OnboardingChecklist
const STEPS = [
  { t: 'Crea tu complejo', d: 'Registra sede, dirección y WhatsApp', href: '/admin/complejos/nuevo' },
  { t: 'Agrega tus canchas', d: 'Tipo, precio por hora y formato', href: '/admin/canchas' },
  { t: 'Configura tus horarios', d: 'Turnos sin solapamientos automáticos', href: '/admin/horarios' },
  { t: 'Sube tus fotos', d: '5+ fotos = +40% reservas', href: '/admin/canchas' },
  { t: 'Comparte tu página', d: 'QR + link para WhatsApp', href: '/admin/complejos' },
]

function simularEstadoChecklist(datos) {
  const completados = pasosOnboarding(datos)
  const actualIndex = STEPS.findIndex((_, i) => !completados[i])
  const hechos = STEPS.filter((_, i) => completados[i]).length
  const pasosRenderizados = STEPS.map((step, i) => {
    const ok = Boolean(completados[i])
    const current = i === actualIndex
    return {
      indice: i + 1,
      titulo: step.t,
      descripcion: step.d,
      href: step.href,
      completado: ok,
      esActual: current,
      ctaLabel: ok ? null : current ? 'Empezar' : 'Ver guía',
      badgeColor: ok ? 'bg-[#22C55E]' : 'bg-white',
    }
  })
  return {
    completados,
    hechos,
    total: STEPS.length,
    contadorTexto: `${hechos} de ${STEPS.length} pasos completados`,
    pasos: pasosRenderizados,
    actualIndex,
  }
}

describe('Simulación de cuenta Dueño A6 - Onboarding /admin/ayuda', () => {
  it('Arquetipo 1: Dueño recién registrado sin complejos creados', () => {
    const datos = {
      complejos: [],
      canchas: [],
      horarios: {},
    }
    const estado = simularEstadoChecklist(datos)

    assert.deepEqual(estado.completados, [false, false, false, false, false])
    assert.equal(estado.hechos, 0)
    assert.equal(estado.contadorTexto, '0 de 5 pasos completados')
    assert.equal(estado.actualIndex, 0)

    // Paso 1 debe ser el actual con CTA "Empezar" hacia /admin/complejos/nuevo
    assert.equal(estado.pasos[0].completado, false)
    assert.equal(estado.pasos[0].esActual, true)
    assert.equal(estado.pasos[0].ctaLabel, 'Empezar')
    assert.equal(estado.pasos[0].href, '/admin/complejos/nuevo')

    // Pasos 2 a 5 deben estar inactivos con CTA "Ver guía"
    for (let i = 1; i < 5; i++) {
      assert.equal(estado.pasos[i].completado, false)
      assert.equal(estado.pasos[i].esActual, false)
      assert.equal(estado.pasos[i].ctaLabel, 'Ver guía')
    }
  })

  it('Arquetipo 2: Dueño crea su primer complejo pero aún no añade canchas', () => {
    const datos = {
      complejos: [crearComplejo('comp-1', 'Club Melgar')],
      canchas: [],
      horarios: { 'comp-1': [] },
    }
    const estado = simularEstadoChecklist(datos)

    assert.deepEqual(estado.completados, [true, false, false, false, false])
    assert.equal(estado.hechos, 1)
    assert.equal(estado.contadorTexto, '1 de 5 pasos completados')
    assert.equal(estado.actualIndex, 1)

    // Paso 1 completado (sin CTA)
    assert.equal(estado.pasos[0].completado, true)
    assert.equal(estado.pasos[0].ctaLabel, null)

    // Paso 2 es el actual con CTA "Empezar" hacia /admin/canchas
    assert.equal(estado.pasos[1].completado, false)
    assert.equal(estado.pasos[1].esActual, true)
    assert.equal(estado.pasos[1].ctaLabel, 'Empezar')
    assert.equal(estado.pasos[1].href, '/admin/canchas')

    // Pasos 3 a 5 "Ver guía"
    assert.equal(estado.pasos[2].ctaLabel, 'Ver guía')
    assert.equal(estado.pasos[2].href, '/admin/horarios')
  })

  it('Arquetipo 3: Dueño con canchas creadas pero sin horarios operativos guardados', () => {
    const datos = {
      complejos: [crearComplejo('comp-1', 'Club Melgar')],
      canchas: [
        crearCancha('cancha-1', 'comp-1', { activa: true, imagen: 'img1.jpg' }),
        crearCancha('cancha-2', 'comp-1', { activa: true, imagen: 'img2.jpg' }),
      ],
      horarios: { 'comp-1': [] }, // No hay filas guardadas aún
    }
    const estado = simularEstadoChecklist(datos)

    // Pasos 1, 2 y 4 (fotos) completados; paso 3 (horarios) pendiente
    assert.deepEqual(estado.completados, [true, true, false, true, false])
    assert.equal(estado.hechos, 3)
    assert.equal(estado.contadorTexto, '3 de 5 pasos completados')
    assert.equal(estado.actualIndex, 2)

    // Paso 3 es el actual con CTA "Empezar" hacia /admin/horarios
    assert.equal(estado.pasos[2].completado, false)
    assert.equal(estado.pasos[2].esActual, true)
    assert.equal(estado.pasos[2].ctaLabel, 'Empezar')
    assert.equal(estado.pasos[2].href, '/admin/horarios')

    // Paso 4 ya está completado porque todas las canchas tienen imagen
    assert.equal(estado.pasos[3].completado, true)
    assert.equal(estado.pasos[3].ctaLabel, null)
  })

  it('Arquetipo 4: Dueño con canchas y horarios, pero 1 cancha activa carece de foto', () => {
    const datos = {
      complejos: [crearComplejo('comp-1', 'Club Melgar')],
      canchas: [
        crearCancha('cancha-1', 'comp-1', { activa: true, imagen: 'img1.jpg' }),
        crearCancha('cancha-2', 'comp-1', { activa: true, imagen: null }), // Falta foto
      ],
      horarios: { 'comp-1': [crearHorario('h-1', 'comp-1', { activo: true })] },
    }
    const estado = simularEstadoChecklist(datos)

    assert.deepEqual(estado.completados, [true, true, true, false, false])
    assert.equal(estado.hechos, 3)
    assert.equal(estado.actualIndex, 3)

    // Paso 4 es el actual con CTA "Empezar" hacia /admin/canchas
    assert.equal(estado.pasos[3].completado, false)
    assert.equal(estado.pasos[3].esActual, true)
    assert.equal(estado.pasos[3].ctaLabel, 'Empezar')
    assert.equal(estado.pasos[3].href, '/admin/canchas')
  })

  it('Arquetipo 5: Dueño con negocio completamente operativo (4 de 5 pasos listos)', () => {
    const datos = {
      complejos: [crearComplejo('comp-1', 'Club Melgar')],
      canchas: [
        crearCancha('cancha-1', 'comp-1', { activa: true, imagen: 'img1.jpg' }),
        crearCancha('cancha-2', 'comp-1', { activa: true, imagen: 'img2.jpg' }),
      ],
      horarios: {
        'comp-1': [
          crearHorario('h-1', 'comp-1', { activo: true, diaSemana: 1 }),
          crearHorario('h-2', 'comp-1', { activo: true, diaSemana: 2 }),
        ],
      },
    }
    const estado = simularEstadoChecklist(datos)

    assert.deepEqual(estado.completados, [true, true, true, true, false])
    assert.equal(estado.hechos, 4)
    assert.equal(estado.contadorTexto, '4 de 5 pasos completados')
    assert.equal(estado.actualIndex, 4)

    // Pasos 1 a 4 con check verde
    for (let i = 0; i < 4; i++) {
      assert.equal(estado.pasos[i].completado, true)
      assert.equal(estado.pasos[i].ctaLabel, null)
    }

    // Paso 5 (Compartir) es siempre manual / pendiente por spec
    assert.equal(estado.pasos[4].completado, false)
    assert.equal(estado.pasos[4].esActual, true)
    assert.equal(estado.pasos[4].ctaLabel, 'Empezar')
    assert.equal(estado.pasos[4].href, '/admin/complejos')
  })

  it('Arquetipo 6: Dueño multi-sede (Complejo Yanahuara + Complejo Cayma)', () => {
    // Sede 1 tiene canchas y horarios, Sede 2 aún no tiene horarios
    const datosParcial = {
      complejos: [
        crearComplejo('comp-1', 'Complejo Yanahuara'),
        crearComplejo('comp-2', 'Complejo Cayma'),
      ],
      canchas: [
        crearCancha('c-1', 'comp-1', { activa: true, imagen: 'img1.jpg' }),
        crearCancha('c-2', 'comp-2', { activa: true, imagen: 'img2.jpg' }),
      ],
      horarios: {
        'comp-1': [crearHorario('h-1', 'comp-1', { activo: true })],
        'comp-2': [], // Falta en Sede 2
      },
    }
    const estadoParcial = simularEstadoChecklist(datosParcial)
    // El paso de horarios exige que TODOS los complejos del dueño tengan horario
    assert.equal(estadoParcial.completados[2], false)

    // Cuando Sede 2 configura horarios:
    const datosCompleto = {
      ...datosParcial,
      horarios: {
        'comp-1': [crearHorario('h-1', 'comp-1', { activo: true })],
        'comp-2': [crearHorario('h-2', 'comp-2', { activo: true })],
      },
    }
    const estadoCompleto = simularEstadoChecklist(datosCompleto)
    assert.equal(estadoCompleto.completados[2], true)
  })

  it('Arquetipo 7: Falla de red / error en la API de horarios (degradación controlada)', () => {
    const datos = {
      complejos: [crearComplejo('comp-1', 'Club Melgar')],
      canchas: [crearCancha('c-1', 'comp-1', { activa: true, imagen: 'img.jpg' })],
      horarios: { 'comp-1': null }, // Simula que la API falló y devolvería null
    }
    const estado = simularEstadoChecklist(datos)

    // No debe lanzar excepción ni marcar falso positivo
    assert.equal(estado.completados[2], false)
    assert.equal(estado.hechos, 3)
  })
})
