import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, Min, ValidateNested } from 'class-validator';

export class CreateHotelBookingRoomDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateHotelBookingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hotelId: number;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHotelBookingRoomDto)
  rooms: CreateHotelBookingRoomDto[];
}
