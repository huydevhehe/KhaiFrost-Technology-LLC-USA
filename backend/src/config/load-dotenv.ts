import { resolve } from 'node:path';
import { config } from 'dotenv';
import { BACKEND_ROOT } from './backend-root';

// Real environment variables win over the file, matching @nestjs/config behaviour
export function loadDotenv(): void {
  config({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });
}
