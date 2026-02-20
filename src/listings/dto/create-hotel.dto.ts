import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateHotelDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

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
  rooms?: any;
}
