import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class TransitionProductDto {
  @ApiPropertyOptional({ description: 'When provided, a stale version is rejected with 409' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

export class PublishProductDto extends TransitionProductDto {
  @ApiPropertyOptional({ description: 'Publication time; a future value schedules the product' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date;
}
