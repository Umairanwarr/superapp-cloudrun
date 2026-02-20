import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as admin from 'firebase-admin';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async listThreads(userId: number) {
    const lastMessages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        propertyId: true,
        createdAt: true,
        isRead: true,
      },
    });

    const seen = new Set<string>();
    const threads: Array<{
      peerUserId: number;
      propertyId: number | null;
      lastMessage: {
        id: number;
        content: string;
        senderId: number;
        receiverId: number;
        propertyId: number | null;
        createdAt: Date;
        isRead: boolean;
      };
      unreadCount: number;
    }> = [];

    for (const m of lastMessages) {
      const peerUserId = m.senderId === userId ? m.receiverId : m.senderId;
      const key = `${peerUserId}-${m.propertyId ?? 'general'}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const unreadCount = await this.prisma.message.count({
        where: {
          senderId: peerUserId,
          receiverId: userId,
          propertyId: m.propertyId,
          isRead: false,
        },
      });

      threads.push({ peerUserId, propertyId: m.propertyId, lastMessage: m, unreadCount });
    }

    const peerIds = threads.map((t) => t.peerUserId);
    const peers = await this.prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        fullName: true,
        avatar: true,
      },
    });
    const peerMap = new Map(peers.map((p) => [p.id, p]));

    // Fetch property details for threads with propertyId
    const propertyIds = threads.map((t) => t.propertyId).filter((id) => id !== null) as number[];
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        title: true,
        address: true,
        price: true,
        images: true,
      },
    });
    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    return threads
      .map((t) => ({
        peer: peerMap.get(t.peerUserId) ?? null,
        property: t.propertyId ? propertyMap.get(t.propertyId) ?? null : null,
        lastMessage: t.lastMessage,
        unreadCount: t.unreadCount,
      }))
      .filter((t) => t.peer != null);
  }

  async markAsRead(userId: number, senderId: number, propertyId?: number) {
    await this.prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: userId,
        propertyId: propertyId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return { marked: true };
  }

  async listMessagesWithUser(userId: number, otherUserId: number, propertyId?: number) {
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!otherUser) throw new NotFoundException('User not found');

    const msgs = await this.prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          propertyId !== undefined ? { propertyId } : {},
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        propertyId: true,
        createdAt: true,
        isRead: true,
      },
    });

    return msgs;
  }

  async sendDirectMessage(userId: number, dto: SendDirectMessageDto) {
    if (dto.receiverId === userId) {
      throw new BadRequestException('Invalid receiver');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
      select: { id: true, fcmToken: true },
    });
    if (!receiver) throw new NotFoundException('Receiver not found');

    const msg = await this.prisma.message.create({
      data: {
        content: dto.content,
        senderId: userId,
        receiverId: dto.receiverId,
        propertyId: dto.propertyId,
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        propertyId: true,
        createdAt: true,
        isRead: true,
      },
    });

    if (receiver.fcmToken && receiver.fcmToken.trim().length > 0) {
      try {
        await admin.messaging().send({
          token: receiver.fcmToken,
          notification: {
            title: 'New message',
            body: dto.content,
          },
          data: {
            senderId: userId.toString(),
            propertyId: dto.propertyId?.toString() ?? '',
          },
        });
      } catch (_) {
        // Ignore FCM failures so sending message still succeeds
      }
    }

    return {
      message: msg,
      receiverFcmToken: receiver.fcmToken ?? '',
    };
  }
}
