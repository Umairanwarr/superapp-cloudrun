import { Currency, PropertyType, ListingType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsOptional()
  amenities?: string[];

  @IsArray()
  @IsOptional()
  images: string[];

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined)
  longitude?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsString()
  @IsOptional()
  promoCode?: string;

  @IsEnum(ListingType)
  @IsOptional()
  listingType?: ListingType;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined)
  rooms?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined)
  bathrooms?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined)
  area?: number;

  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @IsArray()
  @IsOptional()
  neighborhoodInsights?: string[];
}
