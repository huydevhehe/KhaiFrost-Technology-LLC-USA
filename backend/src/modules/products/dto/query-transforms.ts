import { TransformFnParams } from 'class-transformer';

// Query strings arrive as text; "true"/"false" become booleans and anything else stays for validation to reject
export function toBooleanFlag({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}
