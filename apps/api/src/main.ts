import { createApp } from './app';

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 5200);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido');
  const app = await createApp();
  await app.listen(port, '0.0.0.0');
}

void main().catch(() => {
  process.stderr.write('No se pudo iniciar la API TypeScript.\n');
  process.exitCode = 1;
});
