import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Gender, Currency, Language } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  gender?: Gender;

  @IsOptional()
  currency?: Currency;

  @IsOptional()
  language?: Language;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;

  @IsOptional()
  @IsBoolean()
  isProfileComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
