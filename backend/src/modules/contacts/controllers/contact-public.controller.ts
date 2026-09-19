import { Body, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { ThrottlePublicSubmission } from '../../../common/decorators/throttle-presets.decorator';
import { ContactAcknowledgementDto, CreateContactDto } from '../dto/contact.dto';
import { ContactsService } from '../services/contacts.service';

@PublicController('contact')
export class ContactPublicController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  @ThrottlePublicSubmission()
  @ApiOperation({ summary: 'Send a message from the website contact form' })
  @ApiCreatedResponse({ type: ContactAcknowledgementDto })
  submit(@Body() dto: CreateContactDto): Promise<ContactAcknowledgementDto> {
    return this.contacts.submit(dto);
  }
}
