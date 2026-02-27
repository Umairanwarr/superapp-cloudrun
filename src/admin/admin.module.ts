import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminController, StaffController],
  providers: [AdminService, StaffService],
})
export class AdminModule { }
