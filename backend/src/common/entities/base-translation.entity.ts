import { Column, PrimaryColumn } from 'typeorm';
import { Locale } from '../enums/locale.enum';

export abstract class BaseTranslationEntity {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'varchar', length: 5 })
  locale!: Locale;
}
