import { ApiProperty } from '@nestjs/swagger';
import { AdminSearchType, PublicSearchType } from '../constants/search.constants';

export class AdminSearchResultDto {
  @ApiProperty({ enum: AdminSearchType })
  type!: AdminSearchType;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle!: string | null;

  @ApiProperty({ example: '/admin/blog/3f2c0d5e-0000-4000-8000-000000000000' })
  url!: string;
}

export class PublicSearchResultDto {
  @ApiProperty({ enum: PublicSearchType })
  type!: PublicSearchType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ example: '/bai-viet/gioi-thieu' })
  publicPath!: string;
}
