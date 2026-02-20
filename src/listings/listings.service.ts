import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BookingStatus } from '@prisma/client';

import { PrismaService } from 'prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';

@Injectable()
export class ListingService {
  // Cache analysis results per property (key = propertyId)
  private analysisCache = new Map<number, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) { }

  // ─── Properties ────────────────────────────────────────
  async createProperty(data: CreatePropertyDto, uId: number) {
    try {
      const property = await this.prisma.property.create({
        data: {
          ...data,
          owner: {
            connect: { id: uId },
          },
        },
      });

      return { success: true, message: 'Property created successfully', property };
    } catch (error) {
      throw new InternalServerErrorException(error?.message);
    }
  }

  async getAllProperties() {
    return this.prisma.property.findMany({
      include: {
        reviews: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            avatar: true,
          }
        }
      },
    });
  }

  async getMyProperties(uId: number) {
    return this.prisma.property.findMany({
      where: { ownerId: uId },
      include: {
        reviews: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            avatar: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPropertyById(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        reviews: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            avatar: true,
          }
        }
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async updateProperty(id: number, data: UpdatePropertyDto, uId: number) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.ownerId !== uId) {
      throw new ForbiddenException('You do not own this property');
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data,
    });

    return { success: true, message: 'Property updated successfully', property: updated };
  }

  async deleteProperty(id: number, uId: number) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.ownerId !== uId) {
      throw new ForbiddenException('You do not own this property');
    }

    await this.prisma.property.delete({ where: { id } });
    return { success: true, message: 'Property deleted successfully' };
  }

  // ─── Hotels ────────────────────────────────────────────
  async createHotel(data: CreateHotelDto, uId: number, rooms: { title: string; price: number; image?: string }[] = []) {
    try {
      const hotel = await this.prisma.hotel.create({
        data: {
          ...data,
          owner: {
            connect: { id: uId },
          },
          rooms: rooms.length > 0
            ? {
              create: rooms.map((r) => ({
                title: r.title || 'Room',
                price: r.price || 0,
                image: r.image || null,
              } as any)),
            }
            : undefined,
        },
        include: { rooms: true },
      });

      return { success: true, message: 'Hotel created successfully', hotel };
    } catch (error) {
      throw new InternalServerErrorException(error?.message);
    }
  }

  async getAllHotels() {
    return this.prisma.hotel.findMany({
      include: { rooms: true },
    });
  }

  async getMyHotels(uId: number) {
    return this.prisma.hotel.findMany({
      where: { ownerId: uId },
      include: { rooms: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHotelById(id: number) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: { rooms: true, reviews: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    return hotel;
  }

  async updateHotel(id: number, data: UpdateHotelDto, uId: number, rooms: { id?: number; title: string; price: number; image?: string }[] = []) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: { rooms: true }
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    if (hotel.ownerId !== uId) {
      throw new ForbiddenException('You do not own this hotel');
    }

    // Smart sync for rooms
    const existingRoomIds = hotel.rooms.map(r => r.id);
    const updatedRoomIds = rooms.map(r => r.id).filter(id => id !== undefined);
    const roomsToDelete = existingRoomIds.filter(id => !updatedRoomIds.includes(id));

    // Perform updates in a transaction or sequence
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete rooms that are no longer in the list
      if (roomsToDelete.length > 0) {
        await tx.room.deleteMany({
          where: { id: { in: roomsToDelete } },
        });
      }

      // 2. Create or Update remaining rooms
      for (const roomData of rooms) {
        if (roomData.id) {
          // Update existing
          const existingRoom = hotel.rooms.find(r => r.id === roomData.id);
          await tx.room.update({
            where: { id: roomData.id },
            data: {
              title: roomData.title,
              price: roomData.price,
              image: roomData.image || (existingRoom as any)?.image,
            } as any,
          });
        } else {
          // Create new
          await tx.room.create({
            data: {
              title: roomData.title,
              price: roomData.price,
              image: roomData.image || null,
              hotel: { connect: { id } },
            } as any,
          });
        }
      }

      // 3. Update hotel data
      await tx.hotel.update({
        where: { id },
        data,
      });
    });

    const updated = await this.prisma.hotel.findUnique({
      where: { id },
      include: { rooms: true },
    });

    return { success: true, message: 'Hotel updated successfully', hotel: updated };
  }

  async deleteHotel(id: number, uId: number) {
    const hotel = await this.prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }
    if (hotel.ownerId !== uId) {
      throw new ForbiddenException('You do not own this hotel');
    }

    await this.prisma.hotel.delete({ where: { id } });
    return { success: true, message: 'Hotel deleted successfully' };
  }

  // ─── Rooms ─────────────────────────────────────────────
  async addRoom(
    createRoomDto: CreateRoomDto,
    ownerId: string,
    hotelId: string,
  ) {
    try {
      const room = await this.prisma.room.create({
        data: {
          ...createRoomDto,
          hotel: {
            connect: {
              id: Number(hotelId),
            },
          },
        },
      });
      return room;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getRoomById(id: number) {
    return this.prisma.room.findUnique({ where: { id } });
  }

  async createHotelBooking(data: CreateHotelBookingDto, userId: number) {
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid check-in or check-out date');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    if (!data.rooms || data.rooms.length === 0) {
      throw new BadRequestException('At least one room is required');
    }

    const roomQuantityMap = new Map<number, number>();
    for (const roomSelection of data.rooms) {
      const prevQty = roomQuantityMap.get(roomSelection.roomId) ?? 0;
      roomQuantityMap.set(roomSelection.roomId, prevQty + roomSelection.quantity);
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: data.hotelId },
      include: { rooms: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const roomById = new Map(hotel.rooms.map((room) => [room.id, room]));
    const selectedRoomIds = [...roomQuantityMap.keys()];
    const invalidRoomIds = selectedRoomIds.filter((roomId) => !roomById.has(roomId));

    if (invalidRoomIds.length > 0) {
      throw new BadRequestException('One or more selected rooms are invalid for this hotel');
    }

    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        roomId: { in: selectedRoomIds },
        status: BookingStatus.ACTIVE,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true },
    });

    if (overlappingBookings.length > 0) {
      const unavailableRoomIds = overlappingBookings
        .map((booking) => booking.roomId)
        .filter((roomId): roomId is number => roomId !== null);
      const unavailableTitles = unavailableRoomIds
        .map((roomId) => roomById.get(roomId)?.title)
        .filter((title): title is string => !!title);

      throw new BadRequestException(
        unavailableTitles.length > 0
          ? `Selected room(s) are not available: ${unavailableTitles.join(', ')}`
          : 'Some selected rooms are not available for the selected dates',
      );
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nights <= 0) {
      throw new BadRequestException('Selected stay duration is invalid');
    }

    let totalPrice = 0;
    let totalRooms = 0;
    const bookingData: {
      userId: number;
      hotelId: number;
      roomId: number;
      checkIn: Date;
      checkOut: Date;
      totalPrice: number;
      status: BookingStatus;
    }[] = [];

    for (const roomId of selectedRoomIds) {
      const room = roomById.get(roomId)!;
      const quantity = roomQuantityMap.get(roomId)!;
      const roomTotal = Number(room.price) * nights;

      totalPrice += roomTotal * quantity;
      totalRooms += quantity;

      for (let i = 0; i < quantity; i++) {
        bookingData.push({
          userId,
          hotelId: hotel.id,
          roomId,
          checkIn,
          checkOut,
          totalPrice: roomTotal,
          status: BookingStatus.PENDING,
        });
      }
    }

    const bookings = await this.prisma.$transaction(
      bookingData.map((payload) =>
        this.prisma.booking.create({
          data: payload,
          include: {
            room: { select: { id: true, title: true, price: true } },
          },
        }),
      ),
    );

    return {
      success: true,
      message: 'Hotel booking created successfully',
      bookingGroup: {
        hotelId: hotel.id,
        hotelTitle: hotel.title,
        checkIn,
        checkOut,
        nights,
        totalRooms,
        totalPrice,
        bookings,
      },
    };
  }

  // ─── AI Property Analysis ─────────────────────────────
  async analyzeProperty(propertyId: number) {
    // Check cache first
    const cached = this.analysisCache.get(propertyId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { reviews: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const price = Number(property.price);
    const area = property.area ?? 0;
    const pricePerSqft = area > 0 ? (price / area).toFixed(2) : 'N/A';
    const avgRating =
      property.reviews.length > 0
        ? (
          property.reviews.reduce((sum, r) => sum + r.rating, 0) /
          property.reviews.length
        ).toFixed(1)
        : 'No reviews';

    const prompt = `You are an expert real-estate investment analyst AI.
Analyze the following property and return a JSON object with investment predictions.

PROPERTY DATA:
- Title: ${property.title}
- Price: $${price.toLocaleString()}
- Area: ${area} sqft
- Price per sqft: $${pricePerSqft}
- Rooms: ${property.rooms ?? 'N/A'}
- Bathrooms: ${property.bathrooms ?? 'N/A'}
- Type: ${property.type ?? 'Unknown'}
- Location: ${property.address ?? 'Unknown'}
- Amenities: ${property.amenities.join(', ') || 'None listed'}
- Neighborhood insights: ${(property as any).neighborhoodInsights?.join(', ') || 'None'}
- Average rating: ${avgRating}
- Number of reviews: ${property.reviews.length}

Based on this data, predict:
1. projectedROI — expected annual return on investment as a percentage (e.g. "+8.5%")
2. priceTrend — year-over-year price trend (e.g. "↑6% YoY" or "↓2% YoY")
3. riskLevel — "Low", "Medium", or "High"
4. rentalYield — estimated annual rental yield percentage (e.g. "5.2%")
5. summary — a one-line insight about the investment (max 80 chars)

Return ONLY valid JSON, no markdown, no explanation:
{"projectedROI": "...", "priceTrend": "...", "riskLevel": "...", "rentalYield": "...", "summary": "..."}`;

    try {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
      if (!apiKey) {
        throw new Error('No Gemini API key configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: { temperature: 0 },
      });

      const genResult = await model.generateContent(prompt);
      const text = genResult.response.text().trim();

      // Extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      const analysisResult = {
        projectedROI: analysis.projectedROI ?? '+5.0%',
        priceTrend: analysis.priceTrend ?? '↑3% YoY',
        riskLevel: analysis.riskLevel ?? 'Medium',
        rentalYield: analysis.rentalYield ?? '4.0%',
        summary: analysis.summary ?? 'Stable investment opportunity.',
        source: 'gemini-ai',
      };

      // Store in cache
      this.analysisCache.set(propertyId, { data: analysisResult, timestamp: Date.now() });
      return analysisResult;
    } catch (error) {
      // Fallback: heuristic-based analysis when AI is unavailable
      console.warn('Gemini AI analysis failed, using heuristic fallback:', error?.message);

      const hasGoodAmenities = property.amenities.length >= 3;
      const hasGoodLocation = ((property as any).neighborhoodInsights?.length ?? 0) >= 2;
      const isLargeProperty = area > 1500;
      const isAffordable = price < 500000;

      let roiBase = 4.0;
      if (hasGoodAmenities) roiBase += 1.5;
      if (hasGoodLocation) roiBase += 2.0;
      if (isLargeProperty) roiBase += 1.0;
      if (isAffordable) roiBase += 0.5;
      if (property.reviews.length > 0 && parseFloat(avgRating) >= 4.0) roiBase += 1.0;

      const trendBase = roiBase * 0.7;
      const rentalYieldBase = 3.0 + (roiBase * 0.3);
      const riskLevel = roiBase >= 7 ? 'Low' : roiBase >= 5 ? 'Medium' : 'High';

      const fallbackResult = {
        projectedROI: `+${roiBase.toFixed(1)}%`,
        priceTrend: `↑${trendBase.toFixed(0)}% YoY`,
        riskLevel,
        rentalYield: `${rentalYieldBase.toFixed(1)}%`,
        summary: `${riskLevel}-risk property with ${hasGoodAmenities ? 'strong' : 'basic'} amenities.`,
        source: 'heuristic',
      };

      // Store fallback in cache too
      this.analysisCache.set(propertyId, { data: fallbackResult, timestamp: Date.now() });
      return fallbackResult;
    }
  }
}
