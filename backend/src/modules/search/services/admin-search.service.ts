import { Injectable } from '@nestjs/common';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { ResponseWithMeta } from '../../../common/dto/response-with-meta';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import {
  ADMIN_SEARCH_PERMISSION,
  ADMIN_SEARCH_ROUTE,
  ADMIN_SEARCH_TYPES,
  AdminSearchType,
} from '../constants/search.constants';
import { AdminSearchQueryDto } from '../dto/search-query.dto';
import { AdminSearchResultDto } from '../dto/search-response.dto';
import { AdminSearchRepository } from '../repositories/admin-search.repository';

@Injectable()
export class AdminSearchService {
  constructor(private readonly repository: AdminSearchRepository) {}

  async search(
    user: Pick<AuthenticatedUser, 'role'>,
    query: AdminSearchQueryDto,
  ): Promise<ResponseWithMeta<AdminSearchResultDto[], Record<string, unknown>>> {
    const permitted = ADMIN_SEARCH_TYPES.filter((type) =>
      roleHasPermission(user.role, ADMIN_SEARCH_PERMISSION[type]),
    );
    // Requesting a type the caller may not read is silently ignored, never an error or a leak
    const requested = query.types?.length ? new Set(query.types) : null;
    const types = permitted.filter((type) => !requested || requested.has(type));

    const pattern = containsPattern(query.q);
    const groups = await Promise.all(
      types.map(async (type) => ({
        type,
        rows: await this.repository.search(type, pattern, query.limit, user.role),
      })),
    );

    const counts: Partial<Record<AdminSearchType, number>> = {};
    const results: AdminSearchResultDto[] = [];
    for (const group of groups) {
      counts[group.type] = group.rows.length;
      for (const row of group.rows) {
        results.push({
          type: group.type,
          id: row.id,
          title: row.title,
          subtitle: row.subtitle,
          url: `${ADMIN_SEARCH_ROUTE[group.type]}/${row.id}`,
        });
      }
    }
    return new ResponseWithMeta(results, { query: query.q, types, counts });
  }
}
