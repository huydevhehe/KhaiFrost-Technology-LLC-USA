import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { CategoryChildEntity } from './category-child.entity';

@Entity('service_category_case_studies')
@Index(['categoryId'])
export class ServiceCategoryCaseStudy extends CategoryChildEntity {
  @Column({ type: 'uuid', nullable: true })
  imageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'image_id' })
  image?: MediaAsset | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  durationLabel!: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags!: string[];
}
