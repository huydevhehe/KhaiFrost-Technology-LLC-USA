import { registerDecorator, ValidationOptions } from 'class-validator';

const MAX_ENTRIES = 30;
const MAX_VALUE_LENGTH = 200;
const KEY_PATTERN = /^[A-Za-z0-9_. -]{1,50}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isFlatSpecifications(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > MAX_ENTRIES) return false;
  return entries.every(([key, entry]) => {
    if (!KEY_PATTERN.test(key) || FORBIDDEN_KEYS.has(key)) return false;
    if (typeof entry === 'string') return entry.length <= MAX_VALUE_LENGTH;
    return typeof entry === 'number' && Number.isFinite(entry);
  });
}

// A flat map of short string/number values, e.g. { cpu: "2 vCPU", ram: "4 GB", bandwidth: 1000 }
export function IsFlatSpecifications(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isFlatSpecifications',
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      validator: {
        validate: isFlatSpecifications,
        defaultMessage: () =>
          `specifications must be a flat object of at most ${MAX_ENTRIES} short string or number values`,
      },
    });
  };
}
