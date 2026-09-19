import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { AuthProvider } from '../enums/auth-provider.enum';

@Entity('auth_identities')
@Index(['provider', 'providerUserId'], { unique: true })
@Index(['userId', 'provider'], { unique: true })
export class AuthIdentity {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  provider!: AuthProvider;

  // For the password provider this is the user id; for an external provider the subject it issues
  @Column({ type: 'varchar', length: 255 })
  providerUserId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
