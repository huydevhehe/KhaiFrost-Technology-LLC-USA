import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestimonialStatus } from '../entities/testimonial.entity';

export class TestimonialAdminResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() authorName!: string;
  @ApiPropertyOptional({ nullable: true }) company!: string | null;
  @ApiPropertyOptional({ nullable: true }) location!: string | null;
  @ApiProperty() rating!: number;
  @ApiProperty({ enum: TestimonialStatus }) status!: TestimonialStatus;
  @ApiProperty() sortOrder!: number;
  @ApiPropertyOptional({ nullable: true }) avatarId!: string | null;
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) createdById!: string | null;
  @ApiProperty({ description: '{ vi?: { quote, authorRole }, en?: {...} }' })
  translations!: Record<string, { quote: string; authorRole: string | null }>;
}

export class TestimonialPublicResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() authorName!: string;
  @ApiPropertyOptional({ nullable: true }) company!: string | null;
  @ApiPropertyOptional({ nullable: true }) location!: string | null;
  @ApiProperty() rating!: number;
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty() quote!: string;
  @ApiPropertyOptional({ nullable: true }) authorRole!: string | null;
}
