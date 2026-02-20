import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async addPropertyReview(
    userId: number,
    propertyId: number,
    createReviewDto: CreateReviewDto,
  ) {
    try {
      const property = await this.prisma.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        throw new NotFoundException('Property not found');
      }

      const existing = await this.prisma.review.findFirst({
        where: {
          userId,
          propertyId,
        },
      });

      if (existing) {
        throw new ForbiddenException('You already reviewed this property');
      }

      return await this.prisma.review.create({
        data: {
          ...createReviewDto,
          user: { connect: { id: userId } },
          property: { connect: { id: propertyId } },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getPropertyReviews(propertyId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const reviews = await this.prisma.review.findMany({
      where: { propertyId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const total = await this.prisma.review.count({
      where: { propertyId },
    });

    return {
      data: reviews,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async addHotelReview(
    userId: number,
    hotelId: number,
    createReviewDto: CreateReviewDto,
  ) {
    try {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: hotelId },
      });

      if (!hotel) {
        throw new NotFoundException('Hotel not found');
      }

      const existing = await this.prisma.review.findFirst({
        where: {
          userId,
          hotelId,
        },
      });

      if (existing) {
        throw new ForbiddenException('You already reviewed this hotel');
      }

      return await this.prisma.review.create({
        data: {
          ...createReviewDto,
          user: { connect: { id: userId } },
          hotel: { connect: { id: hotelId } },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getHotelReviews(hotelId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const reviews = await this.prisma.review.findMany({
      where: { hotelId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const total = await this.prisma.review.count({
      where: { hotelId },
    });

    return {
      data: reviews,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
