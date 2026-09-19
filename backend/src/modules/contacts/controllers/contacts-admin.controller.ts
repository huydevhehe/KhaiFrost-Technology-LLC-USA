import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ResponseWithMeta } from '../../../common/dto/response-with-meta';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  AssignContactDto,
  ContactDetailResponseDto,
  ContactListItemResponseDto,
  ContactNoteResponseDto,
  ContactSummaryResponseDto,
  CreateContactNoteDto,
  ListContactsQueryDto,
  UpdateContactStatusDto,
} from '../dto/contact.dto';
import { ContactsService } from '../services/contacts.service';

@AdminController('contacts')
export class ContactsAdminController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @RequirePermissions(Permission.CONTACT_READ)
  @ApiOperation({ summary: 'List contact messages (meta includes unreadCount)' })
  @ApiOkResponse({ type: [ContactListItemResponseDto] })
  list(
    @Query() query: ListContactsQueryDto,
  ): Promise<ResponseWithMeta<ContactListItemResponseDto[], Record<string, unknown>>> {
    return this.contacts.list(query);
  }

  @Get('summary')
  @RequirePermissions(Permission.CONTACT_READ)
  @ApiOperation({ summary: 'Number of contacts per status' })
  @ApiOkResponse({ type: ContactSummaryResponseDto })
  summary(): Promise<ContactSummaryResponseDto> {
    return this.contacts.summary();
  }

  @Get(':id')
  @RequirePermissions(Permission.CONTACT_READ)
  @ApiOperation({ summary: 'Read one contact (does not change its status)' })
  @ApiOkResponse({ type: ContactDetailResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<ContactDetailResponseDto> {
    return this.contacts.getById(id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.CONTACT_UPDATE)
  @AuditAction('contact.status-changed', 'Contact')
  @ApiOperation({ summary: 'Move a contact along new, seen, replied, archived' })
  @ApiOkResponse({ type: ContactDetailResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactStatusDto,
  ): Promise<ContactDetailResponseDto> {
    return this.contacts.updateStatus(id, dto.status);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CONTACT_ASSIGN)
  @AuditAction('contact.assigned', 'Contact')
  @ApiOperation({ summary: 'Assign a contact to a staff member or clear the assignment' })
  @ApiOkResponse({ type: ContactDetailResponseDto })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignContactDto,
  ): Promise<ContactDetailResponseDto> {
    return this.contacts.assign(id, dto.assignedToId);
  }

  @Post(':id/notes')
  @RequirePermissions(Permission.CONTACT_UPDATE)
  @AuditAction('contact.note-added', 'ContactNote')
  @ApiOperation({ summary: 'Add an internal note' })
  @ApiCreatedResponse({ type: ContactNoteResponseDto })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContactNoteResponseDto> {
    return this.contacts.addNote(id, user.id, dto.note);
  }

  @Get(':id/notes')
  @RequirePermissions(Permission.CONTACT_READ)
  @ApiOperation({ summary: 'List internal notes, oldest first' })
  @ApiOkResponse({ type: [ContactNoteResponseDto] })
  listNotes(@Param('id', ParseUUIDPipe) id: string): Promise<ContactNoteResponseDto[]> {
    return this.contacts.listNotes(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CONTACT_DELETE)
  @AuditAction('contact.deleted', 'Contact')
  @ApiOperation({ summary: 'Soft delete a contact' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.contacts.remove(id);
  }
}
