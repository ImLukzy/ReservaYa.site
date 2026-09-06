import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Seed bloqueado en producción. Define ALLOW_PROD_SEED=true solo si sabes lo que haces.')
  }
  console.log('Iniciando seed...')

  const passwords = {
    superadmin: process.env.SEED_SUPERADMIN_PASSWORD,
    admin: process.env.SEED_ADMIN_PASSWORD,
    usuario: process.env.SEED_USUARIO_PASSWORD,
    tecnico: process.env.SEED_TECNICO_PASSWORD,
  }
  if (!passwords.superadmin || !passwords.admin || !passwords.usuario || !passwords.tecnico) {
    console.warn('Seed: usando contraseñas débiles de desarrollo. Define SEED_*_PASSWORD para otras.')
    passwords.superadmin ??= 'superadmin123'
    passwords.admin ??= 'admin123'
    passwords.usuario ??= 'usuario123'
    passwords.tecnico ??= 'tecnico123'
  }

  // Limpieza total en orden hijos -> padres (todas las tablas B2B incluidas).
  await prisma.sancion.deleteMany()
  await prisma.suscripcion.deleteMany()
  await prisma.movimientoCaja.deleteMany()
  await prisma.inscripcionTorneo.deleteMany()
  await prisma.partidoTorneo.deleteMany()
  await prisma.resena.deleteMany()
  await prisma.promocion.deleteMany()
  await prisma.meta.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.cajaSesion.deleteMany()
  await prisma.reserva.deleteMany()
  await prisma.cancha.deleteMany()
  await prisma.complejoMiembro.deleteMany()
  await prisma.torneo.deleteMany()
  await prisma.complejo.deleteMany()
  await prisma.usuario.deleteMany()

  const superadmin = await prisma.usuario.create({
    data: {
      nombre: 'Super Admin',
      email: 'superadmin@reservafacil.com',
      password: await bcrypt.hash(passwords.superadmin, 10),
      rol: 'SUPERADMIN',
      fechaNacimiento: new Date('1990-01-01'),
      username: 'superadmin',
    },
  })

  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@reservafacil.com',
      password: await bcrypt.hash(passwords.admin, 10),
      rol: 'ADMIN',
      fechaNacimiento: new Date('1990-01-01'),
      username: 'admin',
    },
  })

  const usuario = await prisma.usuario.create({
    data: {
      nombre: 'Juan Pérez',
      email: 'usuario@reservafacil.com',
      password: await bcrypt.hash(passwords.usuario, 10),
      rol: 'USUARIO',
      fechaNacimiento: new Date('2000-01-01'),
      username: 'juanperez10',
    },
  })

  await prisma.usuario.create({
    data: {
      nombre: 'Soporte Plataforma',
      email: 'tecnico@reservafacil.com',
      password: await bcrypt.hash(passwords.tecnico, 10),
      rol: 'TECNICO',
      fechaNacimiento: new Date('1990-01-01'),
      username: 'tecnico',
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
        codigo: 'RF-S001',
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
        codigo: 'RF-S002',
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
        codigo: 'RF-S003',
        fecha: pasado,
        horaInicio: 720, // 12:00
        horaFin: 840,    // 14:00 (2 horas)
        estado: 'COMPLETADA',
        total: '80.00',
      },
    ],
  })

  console.log('Seed completado: superadmin, admin, usuario y tecnico listos.')
}

main()
  .catch((error) => {
    console.error(error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })