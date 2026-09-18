import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

const ONE_MINUTE_MS = 60_000;

// 5 requests/minute per IP: login, password reset, registration
export const ThrottleAuthStrict = () =>
  applyDecorators(Throttle({ default: { limit: 5, ttl: ONE_MINUTE_MS } }));

// 20 requests/minute per IP: refresh, logout, admin session elevation
export const ThrottleAuthStandard = () =>
  applyDecorators(Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } }));

// 5 requests/minute per IP: anonymous form submissions such as contact
export const ThrottlePublicSubmission = () =>
  applyDecorators(Throttle({ default: { limit: 5, ttl: ONE_MINUTE_MS } }));
