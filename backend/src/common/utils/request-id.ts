import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { REQUEST_ID_HEADER } from '../constants/http-headers';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

// Idempotent, so it is safe to call from several middlewares regardless of their order
export function ensureRequestId(request: IncomingMessage, response: ServerResponse): string {
  const holder = request as unknown as { id?: unknown };
  if (typeof holder.id === 'string' && holder.id) {
    if (!response.headersSent && !response.hasHeader(REQUEST_ID_HEADER)) {
      response.setHeader(REQUEST_ID_HEADER, holder.id);
    }
    return holder.id;
  }
  const incoming = request.headers[REQUEST_ID_HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId = candidate && SAFE_REQUEST_ID.test(candidate) ? candidate : randomUUID();
  holder.id = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}
