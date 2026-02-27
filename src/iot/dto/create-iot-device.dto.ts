import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateIoTDeviceDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsNumber()
    @IsOptional()
    propertyId?: number;

    @IsNumber()
    @IsOptional()
    hotelId?: number;
}
