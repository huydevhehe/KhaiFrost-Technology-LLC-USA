import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SeoFieldsDto } from '../../../common/dto/seo-fields.dto';
import { SERVICE_ICON_KEYS } from '../constants/service-catalog.constants';
import { OptionalText } from './optional-text.decorator';
import {
  CaseStudyInputDto,
  FaqInputDto,
  IconTitleDescriptionInputDto,
  PartnerBannerInputDto,
  ProductInputDto,
  StatInputDto,
  TestimonialInputDto,
} from './service-collection-input.dto';
import { TranslationsOf } from './translations-of';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ServiceCategoryTranslationDto extends SeoFieldsDto {
  @OptionalText(200) title?: string | null;
  @OptionalText(200) categoryName?: string | null;
  @OptionalText(500) summary?: string | null;
  @OptionalText(300) heroTitle?: string | null;
  @OptionalText(1000) heroSubtitle?: string | null;
  @OptionalText(150) productsEyebrow?: string | null;
  @OptionalText(300) productsHeading?: string | null;
  @OptionalText(1000) productsIntro?: string | null;
}

export class ServiceCategoryTranslationsDto extends TranslationsOf(ServiceCategoryTranslationDto) {}

// Repeated blocks are replaced as a whole when the key is present; omit a key to leave it untouched
export class ServiceCategoryContentDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Generated from the vi title when omitted' })
  @IsOptional()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  slug?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'MediaAsset id used on cards', nullable: true })
  @IsOptional()
  @IsUUID()
  coverImageId?: string | null;

  @ApiPropertyOptional({ description: 'MediaAsset id used in the hero', nullable: true })
  @IsOptional()
  @IsUUID()
  heroImageId?: string | null;

  @ApiPropertyOptional({ type: ServiceCategoryTranslationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceCategoryTranslationsDto)
  translations?: ServiceCategoryTranslationsDto;

  @ApiPropertyOptional({ type: [StatInputDto], maxItems: 12 })
  @IsOptional()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => StatInputDto)
  stats?: StatInputDto[];

  @ApiPropertyOptional({ type: [ProductInputDto], maxItems: 30 })
  @IsOptional()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductInputDto)
  products?: ProductInputDto[];

  @ApiPropertyOptional({ type: [IconTitleDescriptionInputDto], maxItems: 12 })
  @IsOptional()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => IconTitleDescriptionInputDto)
  processSteps?: IconTitleDescriptionInputDto[];

  @ApiPropertyOptional({ type: [IconTitleDescriptionInputDto], maxItems: 12 })
  @IsOptional()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => IconTitleDescriptionInputDto)
  whyUs?: IconTitleDescriptionInputDto[];

  @ApiPropertyOptional({ type: [CaseStudyInputDto], maxItems: 30 })
  @IsOptional()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CaseStudyInputDto)
  caseStudies?: CaseStudyInputDto[];

  @ApiPropertyOptional({ type: [TestimonialInputDto], maxItems: 20 })
  @IsOptional()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TestimonialInputDto)
  testimonials?: TestimonialInputDto[];

  @ApiPropertyOptional({ type: [FaqInputDto], maxItems: 30 })
  @IsOptional()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FaqInputDto)
  faq?: FaqInputDto[];

  @ApiPropertyOptional({
    type: PartnerBannerInputDto,
    nullable: true,
    description: 'null removes it',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerBannerInputDto)
  partnerBanner?: PartnerBannerInputDto | null;
}

export class CreateServiceCategoryDto extends ServiceCategoryContentDto {
  @ApiProperty({ enum: SERVICE_ICON_KEYS })
  @IsIn(SERVICE_ICON_KEYS)
  iconKey!: string;
}

export class UpdateServiceCategoryDto extends ServiceCategoryContentDto {
  @ApiProperty({ description: 'Version last read by the client (optimistic locking)' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ enum: SERVICE_ICON_KEYS })
  @IsOptional()
  @IsIn(SERVICE_ICON_KEYS)
  iconKey?: string;
}
