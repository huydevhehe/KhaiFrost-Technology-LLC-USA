import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TestimonialStatus } from '../entities/testimonial.entity';
import { OptionalText } from './optional-text.decorator';
import { TranslationsOf } from './translations-of';

export class TestimonialTranslationDto {
  @OptionalText(1000) quote?: string | null;
  @OptionalText(200) authorRole?: string | null;
}
export class TestimonialTranslationsDto extends TranslationsOf(TestimonialTranslationDto) {}

class TestimonialFieldsDto {
  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  company?: string | null;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    enum: TestimonialStatus,
    description: 'Staff can only create hidden ones',
  })
  @IsOptional()
  @IsEnum(TestimonialStatus)
  status?: TestimonialStatus;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  avatarId?: string | null;

  @ApiPropertyOptional({ type: TestimonialTranslationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TestimonialTranslationsDto)
  translations?: TestimonialTranslationsDto;
}

export class CreateTestimonialDto extends TestimonialFieldsDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  authorName!: string;
}

export class UpdateTestimonialDto extends TestimonialFieldsDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  authorName?: string;
}
