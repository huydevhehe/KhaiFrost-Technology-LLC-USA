import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { RequestContextService } from '../../common/context/request-context.service';

type AuditedEntity = { createdById?: string | null; updatedById?: string | null };

@Injectable()
export class AuditColumnsSubscriber implements EntitySubscriberInterface {
  constructor(
    dataSource: DataSource,
    private readonly requestContext: RequestContextService,
  ) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<AuditedEntity>): void {
    const userId = this.requestContext.userId;
    if (!userId || !event.entity) return;
    if (event.metadata.findColumnWithPropertyName('createdById') && !event.entity.createdById) {
      event.entity.createdById = userId;
    }
    if (event.metadata.findColumnWithPropertyName('updatedById')) {
      event.entity.updatedById = userId;
    }
  }

  beforeUpdate(event: UpdateEvent<AuditedEntity>): void {
    const userId = this.requestContext.userId;
    if (!userId || !event.entity) return;
    if (event.metadata.findColumnWithPropertyName('updatedById')) {
      event.entity.updatedById = userId;
    }
  }
}
