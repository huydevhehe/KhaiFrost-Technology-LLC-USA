import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { BillingPeriod } from '../enums/billing-period.enum';
import { Currency } from '../enums/currency.enum';

export class ProductPriceInputDto {
  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({
    example: '199.00',
    description: 'Decimal string, at most 2 decimals, greater than 0',
  })
  @Transform(({ value }) =>
    typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal with at most 2 decimals',
  })
  amount!: string;

  @ApiProperty({ enum: BillingPeriod })
  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @ApiPropertyOptional({
    description: 'At most one default per currency; the first price wins if omitted',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
