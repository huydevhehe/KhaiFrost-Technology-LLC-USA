import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceHighlight } from './service-highlight.entity';

@Entity('service_highlight_translations')
@Index(['highlightId', 'locale'], { unique: true })
export class ServiceHighlightTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  highlightId!: string;

  @ManyToOne(() => ServiceHighlight, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'highlight_id' })
  highlight?: ServiceHighlight;

  @Column({ type: 'varchar', length: 200, default: '' })
  title!: string;

  @Column({ type: 'varchar', length: 400, default: '' })
  description!: string;
}
