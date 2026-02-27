import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { JobUrgency } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: 'Job title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Job description is required' })
  description: string;

  @IsOptional()
  @IsEnum(JobUrgency, {
    message: 'Urgency must be a valid JobUrgency enum (URGENT or NORMAL)',
  })
  urgency?: JobUrgency;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Budget must be a positive number' })
  budget?: number;
}
