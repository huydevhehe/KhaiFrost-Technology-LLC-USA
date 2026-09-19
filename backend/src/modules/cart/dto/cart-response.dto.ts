import { ApiProperty } from '@nestjs/swagger';
import { ProductCardDto } from '../../products/dto/product-response.dto';
import { BillingPeriod } from '../../products/enums/billing-period.enum';
import { Currency } from '../../products/enums/currency.enum';

export type CartItemUnavailableReason =
  'PRODUCT_REMOVED' | 'PRODUCT_UNPUBLISHED' | 'PRICE_ON_REQUEST' | 'PRICE_REMOVED';

export class CartItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({
    type: ProductCardDto,
    nullable: true,
    description: 'Null when the product was deleted',
  })
  product!: ProductCardDto | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ description: 'Hosting plans (and other) allow a quantity above 1' })
  allowsQuantity!: boolean;

  @ApiProperty({ enum: BillingPeriod })
  billingPeriod!: BillingPeriod;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ example: '199.00', description: 'Price when the item was added' })
  snapshotUnitPrice!: string;

  @ApiProperty({ nullable: true, description: 'Price today; null when unavailable' })
  currentUnitPrice!: string | null;

  @ApiProperty()
  priceChanged!: boolean;

  @ApiProperty()
  unavailable!: boolean;

  @ApiProperty({ nullable: true })
  unavailableReason!: CartItemUnavailableReason | null;

  @ApiProperty({ description: 'Current price when available, otherwise the snapshot' })
  unitPrice!: string;

  @ApiProperty()
  lineTotal!: string;

  @ApiProperty()
  addedAt!: Date;
}

export class CartDto {
  @ApiProperty({ nullable: true })
  id!: string | null;

  @ApiProperty({ enum: Currency, nullable: true })
  currency!: Currency | null;

  @ApiProperty({ type: [CartItemDto] })
  items!: CartItemDto[];

  @ApiProperty()
  itemCount!: number;

  @ApiProperty({ description: 'Total quantity of the available items' })
  totalQuantity!: number;

  @ApiProperty({
    description: 'Sum of the available lines at current prices, in the cart currency',
  })
  total!: string;

  @ApiProperty()
  hasUnavailableItems!: boolean;

  @ApiProperty()
  hasPriceChanges!: boolean;
}

export class MergedCartLineDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: BillingPeriod })
  billingPeriod!: BillingPeriod;

  @ApiProperty()
  quantity!: number;
}

export class SkippedCartLineDto {
  @ApiProperty()
  productId!: string;

  @ApiProperty({
    description: 'Machine readable reason, e.g. PRODUCT_UNAVAILABLE, PRICE_ON_REQUEST',
  })
  reason!: string;

  @ApiProperty()
  message!: string;
}

export class CartMergeResultDto {
  @ApiProperty({ type: CartDto })
  cart!: CartDto;

  @ApiProperty({ type: [MergedCartLineDto] })
  merged!: MergedCartLineDto[];

  @ApiProperty({ type: [SkippedCartLineDto] })
  skipped!: SkippedCartLineDto[];
}
