import app from './app';
import { config } from './config/env';
import { autoSeedInitialData } from './services/sheetsRepo';

// Auto-seed initial data
autoSeedInitialData().catch(err => {
  console.warn('[Startup] Auto-seed notice:', (err as any)?.message);
});

// Start standalone HTTP listener if not running in serverless mode
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  MSA HR Server running at http://localhost:${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`====================================================`);
  });
}

export default app;


