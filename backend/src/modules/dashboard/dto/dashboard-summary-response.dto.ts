import { ApiProperty } from '@nestjs/swagger';
import { Locale } from '../../../common/enums/locale.enum';

export class CountTrendDto {
  @ApiProperty({ description: 'Rows that currently exist (soft-deleted rows are excluded)' })
  total!: number;

  @ApiProperty({ description: 'Rows created during the last 30 days' })
  createdLast30Days!: number;

  @ApiProperty({ description: 'Rows created during the 30 days before that' })
  createdPrevious30Days!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Percentage change of the last 30 days against the previous 30; null when the previous period had none',
  })
  changePercent!: number | null;
}

export class PublicationStatusBreakdownDto {
  @ApiProperty() draft!: number;
  @ApiProperty() in_review!: number;
  @ApiProperty() published!: number;
  @ApiProperty() archived!: number;
}

export class VisibilityStatusBreakdownDto {
  @ApiProperty() published!: number;
  @ApiProperty() hidden!: number;
}

export class ContactStatusBreakdownDto {
  @ApiProperty() new!: number;
  @ApiProperty() seen!: number;
  @ApiProperty() replied!: number;
  @ApiProperty() archived!: number;
}

export class PublicationCountDto extends CountTrendDto {
  @ApiProperty({ type: PublicationStatusBreakdownDto })
  byStatus!: PublicationStatusBreakdownDto;
}

export class VisibilityCountDto extends CountTrendDto {
  @ApiProperty({ type: VisibilityStatusBreakdownDto })
  byStatus!: VisibilityStatusBreakdownDto;
}

export class ContactCountDto extends CountTrendDto {
  @ApiProperty({ type: ContactStatusBreakdownDto })
  byStatus!: ContactStatusBreakdownDto;

  @ApiProperty({ description: 'Messages still in the "new" status' })
  unread!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ enum: Locale })
  locale!: Locale;

  @ApiProperty({ type: String, format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ type: PublicationCountDto }) posts!: PublicationCountDto;
  @ApiProperty({ type: PublicationCountDto }) products!: PublicationCountDto;
  @ApiProperty({ type: PublicationCountDto }) projects!: PublicationCountDto;
  @ApiProperty({ type: PublicationCountDto }) services!: PublicationCountDto;
  @ApiProperty({ type: VisibilityCountDto }) testimonials!: VisibilityCountDto;
  @ApiProperty({ type: VisibilityCountDto }) clientLocations!: VisibilityCountDto;
  @ApiProperty({ type: CountTrendDto, description: 'Accounts with the customer role' })
  customers!: CountTrendDto;
  @ApiProperty({
    type: CountTrendDto,
    description: 'Accounts with the owner, admin or staff role',
  })
  staffUsers!: CountTrendDto;
  @ApiProperty({ type: ContactCountDto }) contacts!: ContactCountDto;
  @ApiProperty({ type: CountTrendDto }) mediaAssets!: CountTrendDto;
}
