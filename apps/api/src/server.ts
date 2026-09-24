import { createApp } from './app';
import { env } from './config/env';
import { startQueue, stopQueue } from './sync/queue';
import { registerWorkers } from './sync/workers';

const app = createApp();

async function main() {
  await startQueue();
  await registerWorkers();

  const server = app.listen(env.port, () => {
    console.log(`ehr-sync API listening on port ${env.port}`);
  });

  const shutdown = async () => {
    server.close();
    await stopQueue();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Failed to start ehr-sync API', error);
  process.exit(1);
});
