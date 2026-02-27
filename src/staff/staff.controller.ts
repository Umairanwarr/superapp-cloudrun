import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/get-user.decorator';
import type { User } from '@prisma/client';
import { StaffService } from './staff.service';

@Controller('staff')
@UseGuards(AuthGuard('jwt'))
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get('jobs')
    async getMyJobs(@GetUser() user: User) {
        return this.staffService.getMyAssignedJobs(user.id);
    }

    @Post('jobs/:id/accept')
    async acceptJob(
        @Param('id', ParseIntPipe) jobId: number,
        @GetUser() user: User,
    ) {
        return this.staffService.acceptJob(jobId, user.id);
    }

    @Post('jobs/:id/submit')
    async submitJob(
        @Param('id', ParseIntPipe) jobId: number,
        @GetUser() user: User,
        @Body('beforeImage') beforeImage: string,
        @Body('afterImage') afterImage: string,
    ) {
        return this.staffService.submitJob(jobId, user.id, beforeImage, afterImage);
    }

    @Post('jobs/:id/reject')
    async rejectJob(
        @Param('id', ParseIntPipe) jobId: number,
        @GetUser() user: User,
    ) {
        return this.staffService.rejectJob(jobId, user.id);
    }

    @Get('earnings')
    async getMyEarnings(@GetUser() user: User) {
        return this.staffService.getMyEarnings(user.id);
    }
}
