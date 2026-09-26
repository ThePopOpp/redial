import 'server-only';
import { readRuntime } from '../../config/runtime.mjs';

export const runtime = () => readRuntime();
