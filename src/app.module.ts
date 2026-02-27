import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from 'prisma/prisma.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { ListingModule } from './listings/listings.module';
import { StorageModule } from './storage/storage.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewModule } from './review/review.module';
import { ForumModule } from './forum/forum.module';
import { AdminModule } from './admin/admin.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    AiAssistantModule,
    ListingModule,
    StorageModule,
    WishlistModule,
    ReviewModule,
    ForumModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
