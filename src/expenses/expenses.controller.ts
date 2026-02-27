import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpensesService } from './expenses.service';
import { StorageService } from '../storage/storage.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload-receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const url = await this.storageService.uploadImage(file, 'receipts');
    return { receiptUrl: url };
  }

  @Post()
  create(@GetUser() user: User, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.id, dto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.expensesService.findAll(user.id);
  }

  @Get('summary')
  getSummary(@GetUser() user: User) {
    return this.expensesService.getSummary(user.id);
  }

  @Get('by-category')
  getByCategory(@GetUser() user: User) {
    return this.expensesService.getByCategory(user.id);
  }

  @Get('insight')
  getInsight(@GetUser() user: User) {
    return this.expensesService.getInsight(user.id);
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.expensesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(user.id, id);
  }
}
