import { mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { readRuntime, configurationSummary } from '../config/runtime.mjs';

try {
  const config = readRuntime();
  if (config.deployment !== 'development') throw new Error('The hosted container requires REDIAL_DEPLOYMENT=development.');
  await mkdir(config.dataDir, { recursive: true });
  await access(config.dataDir, constants.W_OK);
  console.log('Redial development preview:', JSON.stringify(configurationSummary(config)));
  await import('../server.js');
} catch (error) {
  // Runtime validator errors are intentionally redacted. Filesystem errors can
  // contain paths, so expose those only as a generic startup failure.
  console.error(error.code ? 'Startup failed: the data volume must be writable by UID 1000.' : error.message);
  process.exitCode = 1;
}
