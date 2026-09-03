import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  await prisma.reserva.deleteMany()
  await prisma.cancha.deleteMany()
  await prisma.usuario.deleteMany()

  const superadmin = await prisma.usuario.create({
    data: {
      nombre: 'Super Admin',
      email: 'superadmin@reservafacil.com',
      password: await bcrypt.hash('superadmin123', 10),
      rol: 'SUPERADMIN',
    },
  })

  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@reservafacil.com',
      password: await bcrypt.hash('admin123', 10),
      rol: 'ADMIN',
    },
  })

  const usuario = await prisma.usuario.create({
    data: {
      nombre: 'Juan Pérez',
      email: 'usuario@reservafacil.com',
      password: await bcrypt.hash('usuario123', 10),
      rol: 'USUARIO',
    },
  })

  const [canchaFutbol, canchaTenis, canchaBasquet] = await Promise.all([
    prisma.cancha.create({
      data: {
        nombre: 'Cancha Fútbol 1',
        tipo: 'FUTBOL',
        descripcion: 'Cancha de césped sintético, capacidad 10 personas',
        precioPorHora: 50,
        capacidad: 10,
      },
    }),
    prisma.cancha.create({
      data: {
        nombre: 'Cancha Tenis A',
        tipo: 'TENIS',
        descripcion: 'Cancha de polvo de ladrillo',
        precioPorHora: 30,
        capacidad: 4,
      },
    }),
    prisma.cancha.create({
      data: {
        nombre: 'Cancha Básquet',
        tipo: 'BASQUET',
        descripcion: 'Cancha techada con iluminación LED',
        precioPorHora: 40,
        capacidad: 10,
      },
    }),
  ])

  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const pasado = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  await prisma.reserva.createMany({
    data: [
      {
        usuarioId: usuario.id,
        canchaId: canchaFutbol.id,
        fecha: manana,
        horaInicio: 480, // 08:00
        horaFin: 540,    // 09:00
        estado: 'PENDIENTE',
        total: '50.00',
        notas: 'Partido amistoso',
      },
      {
        usuarioId: usuario.id,
        canchaId: canchaTenis.id,
        fecha: manana,
        horaInicio: 600, // 10:00
        horaFin: 660,    // 11:00
        estado: 'CONFIRMADA',
        total: '30.00',
        notas: 'Clase de tenis',
      },
      {
        usuarioId: admin.id,
        canchaId: canchaBasquet.id,
        fecha: pasado,
        horaInicio: 720, // 12:00
        horaFin: 840,    // 14:00 (2 horas)
        estado: 'COMPLETADA',
        total: '80.00',
      },
    ],
  })

  console.log('Seed completado!')
  console.log('Superadmin:', superadmin.email, '/ superadmin123')
  console.log('Admin:', admin.email, '/ admin123')
  console.log('Usuario:', usuario.email, '/ usuario123')
}

main()
  .catch((error) => {
    console.error(error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })