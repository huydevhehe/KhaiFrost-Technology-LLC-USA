import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ClientLocation } from './client-location.entity';

@Entity('client_location_translations')
@Index(['clientLocationId', 'locale'], { unique: true })
export class ClientLocationTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  clientLocationId!: string;

  @ManyToOne(() => ClientLocation, (location) => location.translations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_location_id' })
  clientLocation?: ClientLocation;

  @Column({ type: 'varchar', length: 1000, default: '' })
  quote!: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  role!: string;

  @Column({ type: 'varchar', length: 120, default: '' })
  country!: string;
}
