import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  title: string;

  @IsNumber()
  @IsOptional()
  area?: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsArray()
  extras: string[];
}
