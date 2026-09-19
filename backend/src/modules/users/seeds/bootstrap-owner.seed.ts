import { DataSource } from 'typeorm';
import { Locale } from '../../../common/enums/locale.enum';
import { Role } from '../../../common/enums/role.enum';
import { normalizePhone } from '../../../common/utils/normalize-phone';
import { bootstrapOwnerConfig } from '../../../config/bootstrap-owner.config';
import { User } from '../entities/user.entity';
import { UserStatus } from '../enums/user-status.enum';
import { evaluatePasswordPolicy } from '../policies/password.policy';
import { PasswordHasher } from '../services/password-hasher.service';

export type BootstrapOwnerResult = 'created' | 'skipped-owner-exists' | 'skipped-not-configured';

export interface BootstrapOwnerSettings {
  email: string;
  phone: string;
  fullName: string;
  password: string;
}

// Idempotent: creates the first owner only when no (non-deleted) owner exists yet
export async function seedBootstrapOwner(
  dataSource: DataSource,
  settings: BootstrapOwnerSettings = bootstrapOwnerConfig(),
): Promise<BootstrapOwnerResult> {
  const repository = dataSource.getRepository(User);
  if (await repository.exist({ where: { role: Role.OWNER } })) return 'skipped-owner-exists';

  const email = settings.email.trim().toLowerCase();
  const fullName = settings.fullName.trim();
  if (!email || !fullName || !settings.phone.trim() || !settings.password) {
    return 'skipped-not-configured';
  }

  const phone = normalizePhone(settings.phone);
  if (!phone) throw new Error('BOOTSTRAP_OWNER_PHONE is not a valid phone number');
  const violations = evaluatePasswordPolicy(settings.password, { email });
  if (violations.length > 0) {
    throw new Error(`BOOTSTRAP_OWNER_PASSWORD is not acceptable: ${violations.join('; ')}`);
  }

  const passwordHash = await new PasswordHasher().hash(settings.password);
  await repository.save(
    repository.create({
      fullName,
      email,
      phone,
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      preferredLocale: Locale.VI,
    }),
  );
  return 'created';
}
