import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { ProductTranslationsPatchDto } from './product-translation-input.dto';

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['translations'])) {
  @ApiProperty({ description: 'Version last read by the client (optimistic locking)' })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ type: ProductTranslationsPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTranslationsPatchDto)
  translations?: ProductTranslationsPatchDto;
}
