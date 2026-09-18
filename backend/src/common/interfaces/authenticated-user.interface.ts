import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  sessionId: string;
  adminSessionActive: boolean;
}
