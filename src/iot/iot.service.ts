import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateIoTDeviceDto } from './dto/create-iot-device.dto';

@Injectable()
export class IoTService {
    private readonly logger = new Logger(IoTService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getAllDevices() {
        return this.prisma.ioTDevice.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                property: { select: { title: true } },
                hotel: { select: { title: true } },
            },
        });
    }

    async createDevice(userId: number, dto: CreateIoTDeviceDto) {
        this.logger.log(`Creating device ${dto.name} for user ${userId}`);
        return this.prisma.ioTDevice.create({
            data: {
                name: dto.name,
                location: dto.location,
                status: dto.status || 'Normal',
                ownerId: userId,
                propertyId: dto.propertyId,
                hotelId: dto.hotelId,
            },
        });
    }

    async removeDevice(userId: number, id: number) {
        this.logger.log(`Removing device ${id} for user ${userId}`);
        const device = await this.prisma.ioTDevice.findUnique({
            where: { id },
        });

        if (!device) {
            throw new NotFoundException(`Device with ID ${id} not found`);
        }

        // Optional: Check if the user is the owner or an admin
        // if (device.ownerId !== userId) {
        //   throw new ForbiddenException('You are not allowed to remove this device');
        // }

        return this.prisma.ioTDevice.delete({
            where: { id },
        });
    }
}
