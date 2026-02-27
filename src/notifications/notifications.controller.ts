import { Controller, Get, Param, Patch, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('admin/notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getAdminNotifications() {
        const data = await this.notificationsService.getAdminNotifications();
        return { success: true, data };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id', ParseIntPipe) id: number) {
        const data = await this.notificationsService.markAsRead(id);
        return { success: true, data };
    }

    @Patch('read-all')
    async markAllAdminAsRead() {
        const data = await this.notificationsService.markAllAdminAsRead();
        return { success: true, data };
    }
}
