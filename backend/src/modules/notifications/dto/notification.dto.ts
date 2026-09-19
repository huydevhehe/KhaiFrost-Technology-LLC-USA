import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';

const toBooleanFlag = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only notifications that have not been read' })
  @IsOptional()
  @Transform(toBooleanFlag)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: Locale, default: DEFAULT_LOCALE })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = DEFAULT_LOCALE;
}

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'contact.created' })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ type: String, nullable: true })
  entityName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  entityId!: string | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class UnreadCountResponseDto {
  @ApiProperty()
  count!: number;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ description: 'Notifications that changed from unread to read' })
  updated!: number;
}
