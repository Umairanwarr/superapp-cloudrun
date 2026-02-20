import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreateForumDto, ForumType } from './dto/create-forum.dto';
import { UpdateForumDto } from './dto/update-forum.dto';

@Controller('forums')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post()
  create(@Body() createForumDto: CreateForumDto) {
    return this.forumService.create(createForumDto);
  }

  @Get()
  findAll(@Query('type') type?: ForumType, @Query('userId') userId?: string) {
    return this.forumService.findAll(type, userId ? parseInt(userId) : undefined);
  }

  @Get('my-forums/:userId')
  getUserForums(@Param('userId') userId: string) {
    return this.forumService.getUserForums(parseInt(userId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumService.findOne(parseInt(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateForumDto: UpdateForumDto) {
    return this.forumService.update(parseInt(id), updateForumDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.forumService.remove(parseInt(id));
  }

  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Body('userId') userId: string) {
    return this.forumService.toggleLike(parseInt(id), parseInt(userId));
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() body: { userId: number; content: string },
  ) {
    return this.forumService.addComment(parseInt(id), body.userId, body.content);
  }

  @Delete('comments/:commentId')
  deleteComment(@Param('commentId') commentId: string, @Body('userId') userId: string) {
    return this.forumService.deleteComment(parseInt(commentId), parseInt(userId));
  }
}
