import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Contact } from './contact.entity';

@Entity('contact_notes')
export class ContactNote extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  contactId!: string;

  @ManyToOne(() => Contact, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact?: Contact;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  authorId!: string | null;

  @Column({ type: 'text' })
  note!: string;
}
