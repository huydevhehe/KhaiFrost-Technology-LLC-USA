import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class PublishPostDto {
  @ApiPropertyOptional({
    description: 'Defaults to now when the post has none yet; a future date schedules the post',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date;
}
