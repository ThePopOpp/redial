import type { Runtime } from './runtime.mjs';
export function checkAccess(request: Request, config: Runtime, mutation?: boolean): { status: number; code: string; message: string } | null;
