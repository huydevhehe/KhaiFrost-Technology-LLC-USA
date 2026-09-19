import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactPublicController } from './controllers/contact-public.controller';
import { ContactsAdminController } from './controllers/contacts-admin.controller';
import { ContactNote } from './entities/contact-note.entity';
import { Contact } from './entities/contact.entity';
import { ContactsService } from './services/contacts.service';

export const CONTACT_ENTITIES = [Contact, ContactNote];

@Module({
  imports: [TypeOrmModule.forFeature(CONTACT_ENTITIES)],
  controllers: [ContactPublicController, ContactsAdminController],
  providers: [ContactsService],
})
export class ContactsModule {}
