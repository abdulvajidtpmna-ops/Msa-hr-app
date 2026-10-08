import app from './app';
import { config } from './config/env';
import { autoSeedInitialData } from './services/sheetsRepo';

async function startServer() {
  try {
    await autoSeedInitialData();
  } catch (err) {
    console.warn('[Startup] Auto-seed warning:', (err as any)?.message);
  }

  const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  MSA HR Server running at http://localhost:${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`====================================================`);
  });

  return server;
}

const serverPromise = startServer();

export default serverPromise;

