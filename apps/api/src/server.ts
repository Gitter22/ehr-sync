import { createApp } from './app';
import { env } from './config/env';
import { startQueue, stopQueue } from './sync/queue';
import { registerWorkers } from './sync/workers';

const app = createApp();

// The database can be briefly unavailable (restart, out of connections) when the API boots. Retry
// with a growing delay instead of exiting, so the machine doesn't burn through Fly's restart limit.
async function startQueueWithRetry(attempts = 8): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await startQueue();
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      const delayMs = Math.min(30_000, 2_000 * 2 ** (attempt - 1));
      console.error(
        `Queue start failed (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  await startQueueWithRetry();
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
