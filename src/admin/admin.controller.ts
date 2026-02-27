import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateJobDto } from './dto/create-job.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminServices: AdminService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('jobs')
  async createJob(@Body() createJobDto: CreateJobDto, @GetUser() user: User) {
    return this.adminServices.createJob(user.id, createJobDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('jobs/:id/apply')
  async applyToJob(@GetUser() user: User, @Param('id') id: number) {
    return this.adminServices.applyToJob(user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('jobs/:id/assign')
  async assignJob(
    @GetUser() user: User,
    @Body('jobId') jobId: number,
    @Body('applierId') applierId: number,
  ) {
    return this.adminServices.assignJob(user.id, jobId, applierId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('jobs/all')
  async getAllJobs() {
    return this.adminServices.getAllJobs();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('jobs/:id/applications')
  async getJobApplications(@GetUser() user: User, @Param('id') id: number) {
    return this.adminServices.viewApplications(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('jobs/:id/submit')
  async submitJob(@GetUser() user: User, @Body('id') id: number) {
    return this.adminServices.submitJob(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('jobs/:id/approve')
  async approveJob(@GetUser() user: User, @Param('id') id: number) {
    return this.adminServices.approveJob(id, user.id);
  }
}
