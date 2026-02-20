import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import type { User } from '@prisma/client';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Post('mark-read/:senderId')
  @UseGuards(AuthGuard('jwt'))
  markAsRead(
    @GetUser() user: User,
    @Param('senderId', ParseIntPipe) senderId: number,
    @Query('propertyId', new ParseIntPipe({ optional: true })) propertyId?: number,
  ) {
    return this.messagesService.markAsRead(user.id, senderId, propertyId);
  }

  @Get('threads')
  @UseGuards(AuthGuard('jwt'))
  listThreads(@GetUser() user: User) {
    return this.messagesService.listThreads(user.id);
  }

  @Get('with/:otherUserId')
  @UseGuards(AuthGuard('jwt'))
  listMessagesWithUser(
    @GetUser() user: User,
    @Param('otherUserId', ParseIntPipe) otherUserId: number,
    @Query('propertyId', new ParseIntPipe({ optional: true })) propertyId?: number,
  ) {
    return this.messagesService.listMessagesWithUser(user.id, otherUserId, propertyId);
  }

  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  sendDirectMessage(@GetUser() user: User, @Body() dto: SendDirectMessageDto) {
    return this.messagesService.sendDirectMessage(user.id, dto);
  }
}
