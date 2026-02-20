import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewService } from './review.service';
import { GetUser } from 'src/auth/get-user.decorator';
import type { User } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('property/:propertyId')
  addPropertyReview(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() createReviewDto: CreateReviewDto,
    @GetUser() user: User,
  ) {
    return this.reviewService.addPropertyReview(
      user.id,
      propertyId,
      createReviewDto,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('hotel/:hotelId')
  addHotelReview(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() createReviewDto: CreateReviewDto,
    @GetUser() user: User,
  ) {
    return this.reviewService.addHotelReview(user.id, hotelId, createReviewDto);
  }

  @Get('property/:propertyId')
  getPropertyReviews(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewService.getPropertyReviews(
      propertyId,
      Number(page),
      Number(limit),
    );
  }

  @Get('hotel/:hotelId')
  getHotelReviews(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewService.getHotelReviews(
      hotelId,
      Number(page),
      Number(limit),
    );
  }
}
