import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityMetadata } from 'typeorm';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { MAX_USAGES_PER_RELATION } from '../constants/media.constants';
import { MediaAsset } from '../entities/media-asset.entity';
import { MediaAssetTranslation } from '../entities/media-asset-translation.entity';

export interface MediaUsage {
  entityName: string;
  entityId?: string;
  field: string;
}

// Relations owned by the media module itself are bookkeeping, not content that uses the file
const IGNORED_OWNER_TARGETS: unknown[] = [MediaAsset, MediaAssetTranslation];

interface ReferencingRelation {
  metadata: EntityMetadata;
  relation: RelationMetadata;
}

@Injectable()
export class MediaUsageService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Finds every entity that points at MediaAsset through the ORM metadata, so feature modules need no registration
  private findReferencingRelations(): ReferencingRelation[] {
    const found: ReferencingRelation[] = [];
    for (const metadata of this.dataSource.entityMetadatas) {
      if (IGNORED_OWNER_TARGETS.includes(metadata.target)) continue;
      for (const relation of metadata.relations) {
        const ownsForeignKey = relation.isManyToOne || relation.isOneToOneOwner;
        if (ownsForeignKey && relation.inverseEntityMetadata.target === MediaAsset) {
          found.push({ metadata, relation });
        }
      }
    }
    return found;
  }

  async listUsages(assetId: string): Promise<MediaUsage[]> {
    const usages: MediaUsage[] = [];
    for (const { metadata, relation } of this.findReferencingRelations()) {
      const idProperty = metadata.primaryColumns.length === 1 ? metadata.primaryColumns[0] : null;
      const builder = this.dataSource
        .createQueryBuilder()
        .from(metadata.target, 'owner')
        .where(`owner.${relation.propertyName} = :assetId`, { assetId })
        .limit(MAX_USAGES_PER_RELATION);
      // Query builders skip soft-deleted rows of the owning entity by default
      if (idProperty) {
        builder.select(`owner.${idProperty.propertyName}`, 'entityId');
        const rows = await builder.getRawMany<{ entityId: string }>();
        for (const row of rows) {
          usages.push({
            entityName: metadata.name,
            entityId: String(row.entityId),
            field: relation.propertyName,
          });
        }
      } else {
        const count = await builder.getCount();
        if (count > 0) usages.push({ entityName: metadata.name, field: relation.propertyName });
      }
    }
    return usages;
  }
}
