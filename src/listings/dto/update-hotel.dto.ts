import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateHotelDto {
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

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined)
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined)
    longitude?: number;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    rooms?: any;
}
