import { PublicationStatus } from '../../../common/enums/publication-status.enum';

// Query-builder fragment for the alias `product`: what the public site is allowed to see
export const VISIBLE_PRODUCT_CONDITION =
  'product.status = :publishedStatus AND product.publishedAt IS NOT NULL AND product.publishedAt <= now()';

export const VISIBLE_PRODUCT_PARAMETERS = { publishedStatus: PublicationStatus.PUBLISHED };
