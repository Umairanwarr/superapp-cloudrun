import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SendDirectMessageDto {
  @IsInt()
  @Min(1)
  receiverId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  propertyId?: number;
}
