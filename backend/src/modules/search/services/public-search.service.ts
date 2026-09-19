import { Injectable } from '@nestjs/common';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import {
  PUBLIC_SEARCH_LIMIT_PER_TYPE,
  PUBLIC_SEARCH_PATH_PREFIX,
  PublicSearchType,
} from '../constants/search.constants';
import { PublicSearchQueryDto } from '../dto/search-query.dto';
import { PublicSearchResultDto } from '../dto/search-response.dto';
import { PublicSearchRepository } from '../repositories/public-search.repository';

const PUBLIC_SEARCH_TYPES = Object.values(PublicSearchType);

@Injectable()
export class PublicSearchService {
  constructor(private readonly repository: PublicSearchRepository) {}

  async search(query: PublicSearchQueryDto): Promise<PublicSearchResultDto[]> {
    const pattern = containsPattern(query.q);
    const groups = await Promise.all(
      PUBLIC_SEARCH_TYPES.map(async (type) => ({
        type,
        rows: await this.repository.search(
          type,
          pattern,
          query.locale,
          PUBLIC_SEARCH_LIMIT_PER_TYPE,
        ),
      })),
    );
    return groups.flatMap(({ type, rows }) =>
      rows.map((row) => ({
        type,
        title: row.title,
        excerpt: row.excerpt,
        slug: row.slug,
        publicPath: `${PUBLIC_SEARCH_PATH_PREFIX[type]}/${row.slug}`,
      })),
    );
  }
}
