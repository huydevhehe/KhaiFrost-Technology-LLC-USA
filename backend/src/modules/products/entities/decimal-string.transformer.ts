import { ValueTransformer } from 'typeorm';
import { normalizeAmount } from '../utils/money';

// numeric(14,2) is exposed as a decimal string, never a float
export const decimalStringTransformer: ValueTransformer = {
  to: (value?: string | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : normalizeAmount(value),
};
