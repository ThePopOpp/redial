import { mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { readRuntime, configurationSummary } from '../config/runtime.mjs';

try {
  const config = readRuntime();
  // `local` is the loopback development mode and has no gate, so it must never
  // be what a hosted container runs. `development` is the password-gated
  // preview and `public` is the real site, where Supabase auth protects /app
  // and /ops.
  if (!['development', 'public'].includes(config.deployment)) {
    throw new Error('The hosted container requires REDIAL_DEPLOYMENT=development or REDIAL_DEPLOYMENT=public.');
  }
  await mkdir(config.dataDir, { recursive: true });
  await access(config.dataDir, constants.W_OK);
  console.log(`Redial ${config.deployment === 'public' ? 'site' : 'development preview'}:`, JSON.stringify(configurationSummary(config)));
  await import('../server.js');
} catch (error) {
  // Runtime validator errors are intentionally redacted. Filesystem errors can
  // contain paths, so expose those only as a generic startup failure.
  console.error(error.code ? 'Startup failed: the data volume must be writable by UID 1000.' : error.message);
  process.exitCode = 1;
}
