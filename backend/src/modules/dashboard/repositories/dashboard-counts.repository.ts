import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

export interface CountWindow {
  since: Date;
  previousSince: Date;
}

export interface GroupedCount {
  key: string | null;
  total: number;
  recent: number;
  previous: number;
}

interface RawGroupedCount {
  key?: string | null;
  total: string;
  recent: string;
  previous: string;
}

@Injectable()
export class DashboardCountsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // One aggregate query per entity; the query builder adds the soft-delete filter automatically
  async countGrouped(
    entity: EntityTarget<ObjectLiteral>,
    groupProperty: string | null,
    window: CountWindow,
  ): Promise<GroupedCount[]> {
    const builder = this.dataSource
      .getRepository(entity)
      .createQueryBuilder('item')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE item.createdAt >= :since)', 'recent')
      .addSelect(
        'COUNT(*) FILTER (WHERE item.createdAt >= :previousSince AND item.createdAt < :since)',
        'previous',
      )
      .setParameters({ since: window.since, previousSince: window.previousSince });
    if (groupProperty) {
      builder.addSelect(`item.${groupProperty}`, 'key').groupBy(`item.${groupProperty}`);
    }
    const rows = await builder.getRawMany<RawGroupedCount>();
    return rows.map((row) => ({
      key: row.key ?? null,
      total: Number(row.total),
      recent: Number(row.recent),
      previous: Number(row.previous),
    }));
  }
}
