import { readRuntime, configurationSummary } from '../config/runtime.mjs';

try {
  console.log(JSON.stringify(configurationSummary(readRuntime()), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
