import app from './app';
import { config } from './config/env';
import { autoSeedInitialData } from './services/sheetsRepo';

// Auto-seed initial data
autoSeedInitialData().catch(err => {
  console.warn('[Startup] Auto-seed notice:', (err as any)?.message);
});

// Start HTTP listener if run directly or as a service
const isDirectRun = require.main === module || (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL_LAMBDA);
if (isDirectRun || process.env.PORT) {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  MSA HR Server running at http://0.0.0.0:${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`====================================================`);
  });
}

export default app;


