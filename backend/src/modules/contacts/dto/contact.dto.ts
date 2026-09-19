import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { IsNormalizablePhone } from '../../../common/validators/is-normalizable-phone.validator';
import { ContactStatus } from '../entities/contact.entity';

// Same rule as the website form (frontend validateContactForm)
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : trim({ value });

export class CreateContactDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  @Matches(EMAIL_PATTERN, { message: 'email must be a valid email address' })
  email!: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @Transform(blankToUndefined)
  @IsOptional()
  @MaxLength(32)
  @IsNormalizablePhone()
  phone?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ maxLength: 5000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ enum: Locale, default: DEFAULT_LOCALE })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @ApiPropertyOptional({ maxLength: 300, description: 'Page the form was submitted from' })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourcePage?: string;

  @ApiPropertyOptional({ maxLength: 200, description: 'Honeypot: real visitors leave it empty' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class ContactAcknowledgementDto {
  @ApiProperty({ example: true }) received!: boolean;
}

export const CONTACT_SORT_FIELDS = ['createdAt', 'status', 'fullName', 'email'] as const;

export class ListContactsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'ISO date or date-time, inclusive' })
  @IsOptional()
  @IsDateString()
  @MaxLength(40)
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date or date-time, inclusive' })
  @IsOptional()
  @IsDateString()
  @MaxLength(40)
  to?: string;
}

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus })
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}

export class AssignContactDto {
  @ApiProperty({ nullable: true, description: 'User id, or null to unassign' })
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  assignedToId!: string | null;
}

export class CreateContactNoteDto {
  @ApiProperty({ maxLength: 2000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note!: string;
}

export class ContactListItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) subject!: string | null;
  @ApiProperty() messagePreview!: string;
  @ApiProperty({ enum: ContactStatus }) status!: ContactStatus;
  @ApiPropertyOptional({ nullable: true }) assignedToId!: string | null;
  @ApiProperty({ enum: Locale }) locale!: Locale;
  @ApiProperty() isSpam!: boolean;
  @ApiProperty() createdAt!: Date;
}

export class ContactDetailResponseDto extends ContactListItemResponseDto {
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ nullable: true }) sourcePage!: string | null;
  @ApiPropertyOptional({ nullable: true }) handledAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) ipAddress!: string | null;
  @ApiPropertyOptional({ nullable: true }) userAgent!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() updatedAt!: Date;
}

export class ContactNoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() contactId!: string;
  @ApiPropertyOptional({ nullable: true }) authorId!: string | null;
  @ApiProperty() note!: string;
  @ApiProperty() createdAt!: Date;
}

export class ContactSummaryResponseDto {
  @ApiProperty() new!: number;
  @ApiProperty() seen!: number;
  @ApiProperty() replied!: number;
  @ApiProperty() archived!: number;
  @ApiProperty() total!: number;
}
