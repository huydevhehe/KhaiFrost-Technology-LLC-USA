import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BillingPeriod } from '../enums/billing-period.enum';
import { Currency } from '../enums/currency.enum';
import { decimalStringTransformer } from './decimal-string.transformer';
import { Product } from './product.entity';

@Entity('product_prices')
@Index('uq_product_prices_key', ['productId', 'currency', 'billingPeriod'], { unique: true })
@Index('uq_product_prices_default_per_currency', ['productId', 'currency'], {
  unique: true,
  where: '"is_default" = true',
})
export class ProductPrice {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'varchar', length: 3 })
  currency!: Currency;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalStringTransformer })
  amount!: string;

  @Column({ type: 'varchar', length: 20 })
  billingPeriod!: BillingPeriod;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;
}
