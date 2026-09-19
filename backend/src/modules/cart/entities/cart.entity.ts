import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Currency } from '../../products/enums/currency.enum';
import type { CartItem } from './cart-item.entity';

// One active cart per user; it holds a single currency, decided by its first item
@Entity('carts')
@Index('uq_carts_user', ['userId'], { unique: true })
export class Cart {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency!: Currency | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany('CartItem', 'cart')
  items?: CartItem[];
}
