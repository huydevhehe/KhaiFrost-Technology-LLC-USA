import { ApiProperty } from '@nestjs/swagger';

export class RecentActivityItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  actorName!: string | null;

  @ApiProperty({ example: 'post.created' })
  action!: string;

  @ApiProperty({ type: String, nullable: true })
  entityName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  entityId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: string;
}
