import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsInt } from 'class-validator';

export enum ExpenseCategory {
  MAINTENANCE = 'MAINTENANCE',
  UTILITIES = 'UTILITIES',
  TAX = 'TAX',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsInt()
  hotelId?: number;
}
