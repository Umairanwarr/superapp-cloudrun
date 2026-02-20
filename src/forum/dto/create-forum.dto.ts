import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

export enum ForumType {
  FORUM = 'FORUM',
  REVIEW = 'REVIEW',
  TIPS = 'TIPS',
}

export class CreateForumDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(ForumType)
  type: ForumType;

  @IsOptional()
  @IsString()
  link?: string;

  @IsNumber()
  userId: number;
}
