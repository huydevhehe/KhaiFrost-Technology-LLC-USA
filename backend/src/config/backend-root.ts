import { resolve } from 'node:path';

// Works from both src/config and dist/config
export const BACKEND_ROOT = resolve(__dirname, '..', '..');
