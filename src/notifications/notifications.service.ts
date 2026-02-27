import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createNotification(data: {
        title: string;
        message: string;
        type?: string;
        userId: number;
        relatedId?: number;
        relatedType?: string;
    }) {
        try {
            this.logger.log(`Creating notification "${data.title}" for user ${data.userId}`);
            return await this.prisma.notification.create({
                data: {
                    title: data.title,
                    message: data.message,
                    type: data.type || 'INFO',
                    userId: data.userId,
                    relatedId: data.relatedId,
                    relatedType: data.relatedType,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to create notification for user ${data.userId}`, error.stack);
        }
    }

    async getAdminNotifications() {
        // Admin receives all notifications created for admins (role ADMIN)
        // We can also just fetch based on user role
        const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (admins.length === 0) return [];

        return this.prisma.notification.findMany({
            where: { userId: { in: admins.map(a => a.id) } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(id: number) {
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }

    async markAllAdminAsRead() {
        const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        if (admins.length === 0) return { count: 0 };

        return this.prisma.notification.updateMany({
            where: { userId: { in: admins.map(a => a.id) }, isRead: false },
            data: { isRead: true }
        });
    }
}
