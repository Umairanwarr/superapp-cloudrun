import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateForumDto, ForumType } from './dto/create-forum.dto';
import { UpdateForumDto } from './dto/update-forum.dto';

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  async create(createForumDto: CreateForumDto) {
    return this.prisma.forum.create({
      data: {
        title: createForumDto.title,
        content: createForumDto.content,
        type: createForumDto.type as any,
        link: createForumDto.link,
        userId: createForumDto.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
  }

  async findAll(type?: ForumType, userId?: number) {
    const where = type ? { type: type as any } : {};
    
    const forums = await this.prisma.forum.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            avatar: true,
            role: true,
          },
        },
        likes: userId ? {
          where: { userId },
          select: { userId: true },
        } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return forums.map(forum => ({
      ...forum,
      likes: forum._count.likes,
      replies: forum._count.comments,
      isLiked: userId ? forum.likes.length > 0 : false,
    }));
  }

  async findOne(id: number) {
    const forum = await this.prisma.forum.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            avatar: true,
            role: true,
          },
        },
        likes: {
          select: { userId: true },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!forum) {
      throw new NotFoundException(`Forum with ID ${id} not found`);
    }

    return {
      ...forum,
      likes: forum._count.likes,
      replies: forum._count.comments,
      likedUserIds: forum.likes.map(l => l.userId),
    };
  }

  async update(id: number, updateForumDto: UpdateForumDto) {
    const forum = await this.prisma.forum.findUnique({ where: { id } });
    
    if (!forum) {
      throw new NotFoundException(`Forum with ID ${id} not found`);
    }

    return this.prisma.forum.update({
      where: { id },
      data: {
        title: updateForumDto.title,
        content: updateForumDto.content,
        type: updateForumDto.type as any,
        link: updateForumDto.link,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const forum = await this.prisma.forum.findUnique({ where: { id } });
    
    if (!forum) {
      throw new NotFoundException(`Forum with ID ${id} not found`);
    }

    await this.prisma.forum.delete({ where: { id } });
    return { message: 'Forum deleted successfully' };
  }

  async toggleLike(forumId: number, userId: number) {
    const existingLike = await this.prisma.forumLike.findUnique({
      where: {
        forumId_userId: {
          forumId,
          userId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.forumLike.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      await this.prisma.forumLike.create({
        data: {
          forumId,
          userId,
        },
      });
      return { liked: true };
    }
  }

  async addComment(forumId: number, userId: number, content: string) {
    const forum = await this.prisma.forum.findUnique({ where: { id: forumId } });
    
    if (!forum) {
      throw new NotFoundException(`Forum with ID ${forumId} not found`);
    }

    return this.prisma.forumComment.create({
      data: {
        content,
        forumId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.prisma.forumComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new NotFoundException('You can only delete your own comments');
    }

    await this.prisma.forumComment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }

  async getUserForums(userId: number) {
    const forums = await this.prisma.forum.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return forums.map(forum => ({
      ...forum,
      likes: forum._count.likes,
      replies: forum._count.comments,
    }));
  }
}
