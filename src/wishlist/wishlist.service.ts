import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class WishlistService {
  async addPropertyToWishlist(userId: number, propertyId: number) {
    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Property already in wishlist');
    }

    return prisma.wishlist.create({
      data: {
        userId,
        propertyId,
      },
    });
  }

  async addHotelToWishlist(userId: number, hotelId: number) {
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Hotel already in wishlist');
    }

    return prisma.wishlist.create({
      data: {
        userId,
        hotelId,
      },
    });
  }

  async removePropertyFromWishlist(userId: number, propertyId: number) {
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Property not in wishlist');
    }

    return prisma.wishlist.delete({
      where: {
        id: wishlistItem.id,
      },
    });
  }

  async removeHotelFromWishlist(userId: number, hotelId: number) {
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Hotel not in wishlist');
    }

    return prisma.wishlist.delete({
      where: {
        id: wishlistItem.id,
      },
    });
  }

  async getMyWishlist(userId: number) {
    const wishlists = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        property: true,
        hotel: {
          include: {
            rooms: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      properties: wishlists.filter((w) => w.property).map((w) => w.property),
      hotels: wishlists.filter((w) => w.hotel).map((w) => w.hotel),
    };
  }

  async isPropertyInWishlist(userId: number, propertyId: number) {
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    return { inWishlist: !!wishlistItem };
  }

  async isHotelInWishlist(userId: number, hotelId: number) {
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
    });

    return { inWishlist: !!wishlistItem };
  }
}
