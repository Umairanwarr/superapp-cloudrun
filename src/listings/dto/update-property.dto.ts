import { Currency, PropertyType, ListingType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';

export class UpdatePropertyDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsOptional()
    amenities?: string[];

    @IsArray()
    @IsOptional()
    images?: string[];

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
    @IsOptional()
    @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined)
    price?: number;

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

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isActive?: boolean;
}
