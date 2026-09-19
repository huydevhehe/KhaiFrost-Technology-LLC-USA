import { ApiProperty } from '@nestjs/swagger';

export class FavoriteStateDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  favorited!: boolean;
}

export class FavoriteIdsDto {
  @ApiProperty({ type: [String], description: 'Published favourite product ids, newest first' })
  productIds!: string[];
}
