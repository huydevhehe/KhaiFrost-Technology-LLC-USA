import { ApiProperty } from '@nestjs/swagger';

export class UiTranslationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() namespace!: string;
  @ApiProperty() key!: string;
  @ApiProperty({ nullable: true, type: String }) valueVi!: string | null;
  @ApiProperty({ nullable: true, type: String }) valueEn!: string | null;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty({ type: [String], description: 'Locales that have no text yet' })
  missingLocales!: string[];
  @ApiProperty() version!: number;
  @ApiProperty() updatedAt!: Date;
}

export class UiTranslationNamespaceSummaryDto {
  @ApiProperty() namespace!: string;
  @ApiProperty() total!: number;
  @ApiProperty() missingVi!: number;
  @ApiProperty() missingEn!: number;
}
