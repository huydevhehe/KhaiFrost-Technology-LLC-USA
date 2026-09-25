import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CATEGORY_ICON_KEYS, DURATION_LABEL_PATTERN } from '../constants/service-catalog.constants';
import { ServiceProductLinkType } from '../constants/service-product-link-type';
import { IsHttpUrlOrSitePath } from '../validators/is-http-url-or-site-path.validator';
import { OptionalText } from './optional-text.decorator';
import { TranslationsOf } from './translations-of';

export class StatTranslationDto {
  @OptionalText(150) label?: string | null;
  @OptionalText(300) description?: string | null;
}
export class StatTranslationsDto extends TranslationsOf(StatTranslationDto) {}
export class StatInputDto {
  @ApiProperty({ enum: CATEGORY_ICON_KEYS })
  @IsIn(CATEGORY_ICON_KEYS)
  iconKey!: string;

  @ApiProperty({ maxLength: 40, example: '50+' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  value!: string;

  @ApiProperty({ type: StatTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => StatTranslationsDto)
  translations!: StatTranslationsDto;
}

class ImageDurationTagsDto {
  @ApiPropertyOptional({ description: 'MediaAsset id', nullable: true })
  @IsOptional()
  @IsUUID()
  imageId?: string | null;

  @ApiPropertyOptional({ example: '02:15', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(DURATION_LABEL_PATTERN, { message: 'durationLabel must look like 02:15' })
  durationLabel?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}

export class ProductTranslationDto {
  @OptionalText(200) name?: string | null;
  @OptionalText(600) description?: string | null;
}
export class ProductTranslationsDto extends TranslationsOf(ProductTranslationDto) {}
export class ProductInputDto {
  @ApiPropertyOptional({ description: 'MediaAsset id', nullable: true })
  @IsOptional()
  @IsUUID()
  imageId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Any video link (YouTube, Vimeo, direct file...)',
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(1000)
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Duration in seconds, read from the video — never typed by hand',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(36000)
  videoDurationSeconds?: number | null;

  @ApiProperty({ enum: ServiceProductLinkType, default: ServiceProductLinkType.NONE })
  @IsIn(Object.values(ServiceProductLinkType))
  linkType!: ServiceProductLinkType;

  @ApiPropertyOptional({ description: 'Required when linkType is product', nullable: true })
  @IsOptional()
  @IsUUID()
  linkProductId?: string | null;

  @ApiPropertyOptional({ description: 'Required when linkType is post', nullable: true })
  @IsOptional()
  @IsUUID()
  linkPostId?: string | null;

  @ApiPropertyOptional({ description: 'Required when linkType is external', nullable: true })
  @IsOptional()
  @IsHttpUrlOrSitePath()
  @MaxLength(500)
  linkExternalUrl?: string | null;

  @ApiProperty({ type: ProductTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductTranslationsDto)
  translations!: ProductTranslationsDto;
}

export class CaseStudyTranslationDto {
  @OptionalText(200) name?: string | null;
  @OptionalText(600) description?: string | null;
}
export class CaseStudyTranslationsDto extends TranslationsOf(CaseStudyTranslationDto) {}
export class CaseStudyInputDto extends ImageDurationTagsDto {
  @ApiProperty({ type: CaseStudyTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CaseStudyTranslationsDto)
  translations!: CaseStudyTranslationsDto;
}

export class TitleDescriptionTranslationDto {
  @OptionalText(200) title?: string | null;
  @OptionalText(400) description?: string | null;
}
export class TitleDescriptionTranslationsDto extends TranslationsOf(
  TitleDescriptionTranslationDto,
) {}

// Process steps, why-us items and highlights share this shape
export class IconTitleDescriptionInputDto {
  @ApiProperty({ enum: CATEGORY_ICON_KEYS })
  @IsIn(CATEGORY_ICON_KEYS)
  iconKey!: string;

  @ApiProperty({ type: TitleDescriptionTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleDescriptionTranslationsDto)
  translations!: TitleDescriptionTranslationsDto;
}

export class TestimonialTranslationDto {
  @OptionalText(1000) quote?: string | null;
  @OptionalText(200) authorRole?: string | null;
}
export class TestimonialTranslationsDto extends TranslationsOf(TestimonialTranslationDto) {}
export class TestimonialInputDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  authorName!: string;

  @ApiPropertyOptional({ description: 'MediaAsset id', nullable: true })
  @IsOptional()
  @IsUUID()
  avatarId?: string | null;

  @ApiProperty({ type: TestimonialTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TestimonialTranslationsDto)
  translations!: TestimonialTranslationsDto;
}

export class FaqTranslationDto {
  @OptionalText(300) question?: string | null;
  @OptionalText(2000) answer?: string | null;
}
export class FaqTranslationsDto extends TranslationsOf(FaqTranslationDto) {}
export class FaqInputDto {
  @ApiProperty({ type: FaqTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => FaqTranslationsDto)
  translations!: FaqTranslationsDto;
}

export class PartnerBannerTranslationDto {
  @OptionalText(150) label?: string | null;
  @OptionalText(300) heading?: string | null;
  @OptionalText(1000) text?: string | null;
  @OptionalText(150) ctaLabel?: string | null;
}
export class PartnerBannerTranslationsDto extends TranslationsOf(PartnerBannerTranslationDto) {}
export class PartnerBannerInputDto {
  @ApiPropertyOptional({ description: 'MediaAsset id', nullable: true })
  @IsOptional()
  @IsUUID()
  imageId?: string | null;

  @ApiProperty({ maxLength: 500, example: '/lien-he' })
  @IsHttpUrlOrSitePath()
  @MaxLength(500)
  ctaHref!: string;

  @ApiProperty({ type: PartnerBannerTranslationsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PartnerBannerTranslationsDto)
  translations!: PartnerBannerTranslationsDto;
}
