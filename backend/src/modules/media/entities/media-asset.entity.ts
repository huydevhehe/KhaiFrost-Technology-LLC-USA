import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export interface MediaVariant {
  storageKey: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
}

@Entity('media_assets')
export class MediaAsset extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 500 })
  storageKey!: string;

  @Column({ type: 'varchar', length: 150 })
  mimeType!: string;

  @Column({
    type: 'bigint',
    transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
  })
  sizeBytes!: number;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Index()
  @Column({ type: 'char', length: 64 })
  checksumSha256!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  folder!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  variants!: Record<string, MediaVariant>;

  @Column({ type: 'uuid', nullable: true })
  uploadedById!: string | null;
}
