import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { decimalStringTransformer } from '../../products/entities/decimal-string.transformer';
import { BillingPeriod } from '../../products/enums/billing-period.enum';
import { Currency } from '../../products/enums/currency.enum';
import { Cart } from './cart.entity';

// productId and priceId are plain ids: products belong to another module and may be unpublished later
@Entity('cart_items')
@Index('uq_cart_items_line', ['cartId', 'productId', 'billingPeriod'], { unique: true })
@Index('idx_cart_items_product', ['productId'])
@Check('"quantity" BETWEEN 1 AND 99')
export class CartItem {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  cartId!: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart?: Cart;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'uuid' })
  priceId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalStringTransformer })
  unitPriceSnapshot!: string;

  @Column({ type: 'varchar', length: 3 })
  currencySnapshot!: Currency;

  @Column({ type: 'varchar', length: 20 })
  billingPeriod!: BillingPeriod;

  @CreateDateColumn({ type: 'timestamptz' })
  addedAt!: Date;
}
