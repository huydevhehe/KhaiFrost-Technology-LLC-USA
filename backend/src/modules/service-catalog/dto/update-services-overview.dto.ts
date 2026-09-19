import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsOptional, ValidateNested } from 'class-validator';
import { IconTitleDescriptionInputDto, StatInputDto } from './service-collection-input.dto';

// Each block present in the payload replaces the stored block; both locales are mandatory because the overview has no draft state
export class UpdateServicesOverviewDto {
  @ApiPropertyOptional({ type: [StatInputDto], maxItems: 12 })
  @IsOptional()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => StatInputDto)
  stats?: StatInputDto[];

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
  highlights?: IconTitleDescriptionInputDto[];
}
