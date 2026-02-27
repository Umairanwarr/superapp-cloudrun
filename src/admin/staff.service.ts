import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class StaffService {
    private readonly logger = new Logger(StaffService.name);

    constructor(private readonly prisma: PrismaService) { }

    private get userSelect() {
        return {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            avatar: true,
            role: true,
        };
    }

    // ── Add staff ─────────────────────────────────────────────────────────────

    async addStaff({
        userId,
        propertyId,
        hotelId,
    }: {
        userId: number;
        propertyId?: number;
        hotelId?: number;
    }) {
        this.logger.log(`Adding user ${userId} as staff`);

        // Check user exists
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException(`User ${userId} not found`);

        // Prevent adding existing staff twice
        const existing = await this.prisma.staff.findUnique({ where: { userId } });
        if (existing)
            throw new BadRequestException('User is already a staff member');

        // Promote role to STAFF if not already admin
        if (user.role === Role.USER || user.role === Role.DRIVER) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { role: Role.STAFF },
            });
        }

        const staff = await this.prisma.staff.create({
            data: { userId, propertyId, hotelId },
            include: { user: { select: this.userSelect } },
        });

        return { success: true, message: 'Staff added successfully', data: staff };
    }

    // ── Remove staff ──────────────────────────────────────────────────────────

    async removeStaff(staffId: number) {
        this.logger.log(`Removing staff ${staffId}`);

        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
        });
        if (!staff) throw new NotFoundException(`Staff ${staffId} not found`);

        // Demote role back to USER
        await this.prisma.user.update({
            where: { id: staff.userId },
            data: { role: Role.USER },
        });

        await this.prisma.staff.delete({ where: { id: staffId } });
        return { success: true, message: 'Staff removed successfully' };
    }

    // ── Get all staff ─────────────────────────────────────────────────────────

    async getAllStaff() {
        const staff = await this.prisma.staff.findMany({
            include: {
                user: { select: this.userSelect },
                property: { select: { id: true, title: true } },
                hotel: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: staff };
    }

    // ── Get staff for job assignment ──────────────────────────────────────────

    async getStaffForAssignment(q?: string) {
        const query = (q ?? '').trim();
        const staff = await this.prisma.staff.findMany({
            where: query
                ? {
                    user: {
                        OR: [
                            { firstName: { contains: query, mode: 'insensitive' } },
                            { lastName: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                }
                : undefined,
            include: { user: { select: this.userSelect } },
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: staff };
    }
}
