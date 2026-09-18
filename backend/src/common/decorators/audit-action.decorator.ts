import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'kf:auditAction';

export interface AuditActionMetadata {
  action: string;
  entityName?: string;
}

export const AuditAction = (action: string, entityName?: string) =>
  SetMetadata<string, AuditActionMetadata>(AUDIT_ACTION_KEY, { action, entityName });
