export const ADMIN_SESSION_ABSOLUTE_MAX_MS = 8 * 60 * 60 * 1000;
export const NON_PERSISTENT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
// A stale refresh token presented this soon after rotation is a race between tabs, not theft
export const REFRESH_REUSE_GRACE_MS = 10_000;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;
export const PASSWORD_RESET_COOLDOWN_MS = 60_000;

export const AuthAuditAction = {
  REGISTERED: 'auth.registered',
  LOGIN_SUCCEEDED: 'auth.login.succeeded',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  LOGOUT_ALL: 'auth.logout-all',
  SESSION_REVOKED: 'auth.session.revoked',
  REFRESH_REUSE_DETECTED: 'auth.refresh.reuse-detected',
  ACCOUNT_LOCKED: 'auth.account.locked',
  ADMIN_SESSION_STARTED: 'auth.admin-session.started',
  ADMIN_SESSION_FAILED: 'auth.admin-session.failed',
  ADMIN_SESSION_ENDED: 'auth.admin-session.ended',
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_CHANGE_FAILED: 'auth.password.change-failed',
  PASSWORD_RESET_REQUESTED: 'auth.password-reset.requested',
  PASSWORD_RESET_FAILED: 'auth.password-reset.failed',
  PASSWORD_RESET_COMPLETED: 'auth.password-reset.completed',
  ACCOUNT_DELETED: 'auth.account.deleted',
} as const;
