import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingPeriod } from '../../products/enums/billing-period.enum';
import { Currency } from '../../products/enums/currency.enum';

export const MAX_ITEM_QUANTITY = 99;
export const MAX_DISTINCT_ITEMS = 50;

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_ITEM_QUANTITY, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity: number = 1;

  @ApiPropertyOptional({
    enum: Currency,
    description: 'Only used to start an empty cart; ignored when it matches the cart currency',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: BillingPeriod, description: 'Required for hosting plans' })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1, maximum: MAX_ITEM_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity!: number;
}

export class MergeCartDto {
  @ApiProperty({ type: [AddCartItemDto], description: 'Guest cart captured in the browser' })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items!: AddCartItemDto[];
}
