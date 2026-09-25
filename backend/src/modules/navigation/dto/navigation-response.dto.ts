import { ApiProperty } from '@nestjs/swagger';

export class AdminNavigationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() linkType!: string;
  @ApiProperty({ nullable: true, type: String }) pageId!: string | null;
  @ApiProperty({ nullable: true, type: String }) pagePath!: string | null;
  @ApiProperty({ nullable: true, type: String }) url!: string | null;
  @ApiProperty() openInNewTab!: boolean;
  @ApiProperty() isVisible!: boolean;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty({ type: Object }) translations!: Record<string, { label: string }>;
  @ApiProperty({ type: () => [AdminNavigationItemDto] }) children!: AdminNavigationItemDto[];
}

export class AdminNavigationMenuDto {
  @ApiProperty() key!: string;
  @ApiProperty({ description: '0 when the menu was never saved' }) version!: number;
  @ApiProperty({ type: [AdminNavigationItemDto] }) items!: AdminNavigationItemDto[];
}

export class PublicNavigationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true, type: String }) href!: string | null;
  @ApiProperty() openInNewTab!: boolean;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty({ type: () => [PublicNavigationItemDto] }) children!: PublicNavigationItemDto[];
}

export class PublicNavigationMenuDto {
  @ApiProperty() key!: string;
  @ApiProperty({ type: [PublicNavigationItemDto] }) items!: PublicNavigationItemDto[];
}
