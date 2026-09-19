import { ApiProperty } from '@nestjs/swagger';
import { Locale } from '../../../common/enums/locale.enum';

export class PublicCoverImageResponse {
  @ApiProperty() url!: string;
  @ApiProperty() thumbnailUrl!: string;
}

export class PublicPostCategoryReferenceResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
}

export class PublicPostListItemResponse {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() excerpt!: string;
  @ApiProperty({ nullable: true, type: () => PublicCoverImageResponse })
  coverImage!: PublicCoverImageResponse | null;
  @ApiProperty({ nullable: true, type: () => PublicPostCategoryReferenceResponse })
  category!: PublicPostCategoryReferenceResponse | null;
  @ApiProperty() publishedAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() readingTimeMinutes!: number;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() isFeatured!: boolean;
}

export class PublicPostSeoResponse {
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true, type: String }) keywords!: string | null;
  @ApiProperty({ nullable: true, type: String }) canonicalUrl!: string | null;
  @ApiProperty() noIndex!: boolean;
  @ApiProperty({ nullable: true, type: String }) ogImageUrl!: string | null;
}

export class PublicPostNeighborResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() publishedAt!: Date;
}

export class PublicPostDetailResponse extends PublicPostListItemResponse {
  @ApiProperty({ enum: Locale }) locale!: Locale;
  @ApiProperty({ description: 'Sanitized HTML' }) contentHtml!: string;
  @ApiProperty({ type: () => PublicPostSeoResponse }) seo!: PublicPostSeoResponse;
  @ApiProperty({
    type: () => [PublicPostListItemResponse],
    description: 'Latest 3 in the same category',
  })
  related!: PublicPostListItemResponse[];
  @ApiProperty({
    nullable: true,
    type: () => PublicPostNeighborResponse,
    description: 'Published just before this one',
  })
  previous!: PublicPostNeighborResponse | null;
  @ApiProperty({
    nullable: true,
    type: () => PublicPostNeighborResponse,
    description: 'Published just after this one',
  })
  next!: PublicPostNeighborResponse | null;
}

export class PublicPostSlugResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() publishedAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PublicPostCategoryResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ description: 'Published, visible articles in this category' }) postCount!: number;
}
