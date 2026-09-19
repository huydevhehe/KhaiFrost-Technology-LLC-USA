import { Role } from '../enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  sessionId: string;
  adminSessionActive: boolean;
  // True while the account still has to replace a bootstrap or temporary password
  mustChangePassword: boolean;
}
