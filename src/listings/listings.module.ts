import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ListingController } from './listings.controller';
import { ListingService } from './listings.service';
import { PrismaService } from 'prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule, ConfigModule],
  controllers: [ListingController],
  providers: [ListingService, PrismaService],
  exports: [ListingService],
})
export class ListingModule { }
