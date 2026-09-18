import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginatedResponseDto } from './paginated-response.dto';
import { PaginationQueryDto } from './pagination-query.dto';

type PaginationInput = Pick<PaginationQueryDto, 'page' | 'pageSize'>;

export function toSkipTake(dto: PaginationInput): { skip: number; take: number } {
  return { skip: (dto.page - 1) * dto.pageSize, take: dto.pageSize };
}

// Pass a query builder (skip/take applied here) or the [items, total] pair from findAndCount
export async function paginate<Entity extends ObjectLiteral, Item = Entity>(
  source: SelectQueryBuilder<Entity> | [Entity[], number],
  dto: PaginationInput,
  mapItem?: (entity: Entity) => Item,
): Promise<PaginatedResponseDto<Item>> {
  let entities: Entity[];
  let total: number;
  if (Array.isArray(source)) {
    [entities, total] = source;
  } else {
    const { skip, take } = toSkipTake(dto);
    [entities, total] = await source.skip(skip).take(take).getManyAndCount();
  }
  const items = mapItem ? entities.map(mapItem) : (entities as unknown as Item[]);
  return new PaginatedResponseDto(items, {
    page: dto.page,
    pageSize: dto.pageSize,
    total,
    totalPages: Math.ceil(total / dto.pageSize),
  });
}

// Only allow-listed sort fields reach the query; anything else falls back to the default
export function resolveSort(
  dto: Pick<PaginationQueryDto, 'sortBy' | 'sortOrder'>,
  allowedFields: readonly string[],
  fallbackField: string,
): { field: string; order: 'ASC' | 'DESC' } {
  const field = dto.sortBy && allowedFields.includes(dto.sortBy) ? dto.sortBy : fallbackField;
  return { field, order: dto.sortOrder };
}
