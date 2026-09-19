import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

// Plain ids on purpose: users and products live in other modules and are resolved through their services
@Entity('favorites')
@Index('uq_favorites_user_product', ['userId', 'productId'], { unique: true })
@Index('idx_favorites_user_created', ['userId', 'createdAt'])
@Index('idx_favorites_product', ['productId'])
export class Favorite {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
