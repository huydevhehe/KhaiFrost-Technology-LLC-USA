import { ApiProperty } from '@nestjs/swagger';

export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export class ContentHealthIssueDto {
  @ApiProperty({ example: 'posts.published_missing_translation' })
  code!: string;

  @ApiProperty({ enum: IssueSeverity })
  severity!: IssueSeverity;

  @ApiProperty({ example: 'Post' })
  entity!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [String], description: 'Up to 5 ids of affected rows' })
  sampleIds!: string[];
}

export class PublishedCountsDto {
  @ApiProperty() posts!: number;
  @ApiProperty() products!: number;
  @ApiProperty() projects!: number;
  @ApiProperty() services!: number;
  @ApiProperty() testimonials!: number;
}

export class ContentHealthResponseDto {
  @ApiProperty() hasPublishedPosts!: boolean;
  @ApiProperty() hasPublishedProducts!: boolean;
  @ApiProperty() hasPublishedProjects!: boolean;
  @ApiProperty() hasPublishedServices!: boolean;
  @ApiProperty() hasPublishedTestimonials!: boolean;

  @ApiProperty({ type: PublishedCountsDto, description: 'Items the public site can show now' })
  counts!: PublishedCountsDto;

  @ApiProperty({ type: [ContentHealthIssueDto] })
  issues!: ContentHealthIssueDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  generatedAt!: string;
}

export class PublicContentHealthResponseDto {
  @ApiProperty() hasPosts!: boolean;
  @ApiProperty() hasProducts!: boolean;
  @ApiProperty() hasProjects!: boolean;
  @ApiProperty() hasServices!: boolean;
  @ApiProperty() hasTestimonials!: boolean;
}
