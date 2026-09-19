// Internal contract between the identity modules; awaited with emitAsync so the effect is done before the response
export const UserEvent = {
  CREATED: 'identity.user-created',
  SESSIONS_REVOKE_REQUESTED: 'identity.sessions-revoke-requested',
  CREDENTIALS_PURGE_REQUESTED: 'identity.credentials-purge-requested',
} as const;

export interface UserCreatedPayload {
  userId: string;
}

export interface SessionsRevokeRequestedPayload {
  userId: string;
  reason: string;
}

export interface CredentialsPurgeRequestedPayload {
  userId: string;
  reason: string;
}
