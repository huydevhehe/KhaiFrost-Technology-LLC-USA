import { EntityManager, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { canSeeOwners, OWNER_DISPLAY_LABEL } from '../../../common/constants/owner-visibility';
import { Role } from '../../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { AuditLogEntry } from '../entities/audit-log-entry.entity';

// Hides everything about owners from non owner viewers: rows that target an owner account are
// dropped, and an owner acting elsewhere is shown as a neutral label (see maskOwnerActor)
export async function restrictAuditToViewer<T extends ObjectLiteral>(
  builder: SelectQueryBuilder<T>,
  manager: EntityManager,
  viewerRole: Role | null | undefined,
  alias = 'entry',
): Promise<SelectQueryBuilder<T>> {
  if (canSeeOwners(viewerRole) || !manager.connection.hasMetadata(User)) return builder;
  // Drop every row an owner acted in, whatever entity it targets (login, session, settings, ...)
  builder.andWhere(`${alias}.actorRole IS DISTINCT FROM 'owner'`);
  const owners = await manager.getRepository(User).find({
    select: { id: true },
    where: { role: Role.OWNER },
    withDeleted: true,
  });
  if (owners.length) {
    // Also drop rows where someone else acted ON an owner's User record (e.g. an admin editing it)
    builder.andWhere(
      `(${alias}.entityName IS DISTINCT FROM 'User' OR ${alias}.entityId IS NULL OR ${alias}.entityId NOT IN (:...auditOwnerIds))`,
      { auditOwnerIds: owners.map((owner) => owner.id) },
    );
  }
  return builder;
}

export function maskOwnerActor(
  entry: Pick<AuditLogEntry, 'actorId' | 'actorName' | 'actorRole'>,
  viewerRole: Role | null | undefined,
): { actorId: string | null; actorName: string | null; actorRole: Role | null } {
  if (canSeeOwners(viewerRole) || entry.actorRole !== Role.OWNER) {
    return { actorId: entry.actorId, actorName: entry.actorName, actorRole: entry.actorRole };
  }
  return { actorId: null, actorName: OWNER_DISPLAY_LABEL, actorRole: null };
}
