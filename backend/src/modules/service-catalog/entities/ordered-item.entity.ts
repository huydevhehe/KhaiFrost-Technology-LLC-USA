import { Column, PrimaryColumn } from 'typeorm';

export abstract class OrderedItemEntity {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
