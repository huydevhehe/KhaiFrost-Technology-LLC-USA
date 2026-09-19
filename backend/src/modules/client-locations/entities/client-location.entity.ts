import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, ValueTransformer } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { ClientLocationTranslation } from './client-location-translation.entity';

export enum ClientLocationStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null || value === undefined ? null : Number(value)),
};

@Entity('client_locations')
@Index(['status', 'sortOrder'])
export class ClientLocation extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  // Percentage position on the world-map image
  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: numericTransformer })
  x!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: numericTransformer })
  y!: number;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  latitude!: number | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  longitude!: number | null;

  @Column({ type: 'varchar', length: 20, default: ClientLocationStatus.HIDDEN })
  status!: ClientLocationStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'uuid', nullable: true })
  avatarId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: MediaAsset | null;

  @Column({ type: 'uuid', nullable: true })
  coverImageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cover_image_id' })
  coverImage?: MediaAsset | null;

  @OneToMany(() => ClientLocationTranslation, (translation) => translation.clientLocation)
  translations?: ClientLocationTranslation[];
}
