import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createJob(userId: number, dto: CreateJobDto) {
    try {
      this.logger.log(
        `User ${userId} is attempting to create a new job: ${dto.title}`,
      );

      const newJob = await this.prisma.job.create({
        data: {
          ...dto,
          ownerId: userId,
        },
      });

      return {
        success: true,
        message: 'Job created successfully',
        data: newJob,
      };
    } catch (error) {
      this.logger.error(`Failed to create job for user ${userId}`, error.stack);
      throw new InternalServerErrorException('Failed to create job');
    }
  }

  async applyToJob(userId: number, jobId: number) {
    try {
      this.logger.log(`User ${userId} is applying to job ${jobId}`);

      const application = await this.prisma.jobAssignment.create({
        data: {
          jobId,
          applierId: userId,
        },
      });
      return {
        success: true,
        message: 'Applied to job successfully',
        data: application,
      };
    } catch (error) {
      this.logger.error(
        `Failed to apply to job ${jobId} for user ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to apply to job');
    }
  }

  async getAllJobs() {
    try {
      this.logger.log('Retrieving all jobs');

      const jobs = await this.prisma.job.findMany({
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
            },
          },
        },
      });
      return {
        success: true,
        message: 'Jobs retrieved successfully',
        data: jobs,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve jobs', error.stack);
      throw new InternalServerErrorException('Failed to retrieve jobs');
    }
  }

  async viewApplications(jobId: number) {
    try {
      this.logger.log(`Viewing applications for job ${jobId}`);

      const applications = await this.prisma.jobAssignment.findMany({
        where: { jobId },
        include: {
          applier: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      });
      return {
        success: true,
        message: 'Applications retrieved successfully',
        data: applications,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve applications for job ${jobId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve applications');
    }
  }

  async assignJob(jobId: number, applierId: number, ownerId: number) {
    try {
      this.logger.log(
        `Assigning job ${jobId} to user ${applierId} by owner ${ownerId}`,
      );
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }
      if (job.ownerId !== ownerId) {
        throw new ForbiddenException(
          'You do not have permission to assign this job',
        );
      }
      if (job.status !== JobStatus.QUEUED) {
        throw new BadRequestException(
          `Job is currently ${job.status} and cannot be assigned again`,
        );
      }
      const [assignment, updatedJob] = await this.prisma.$transaction([
        this.prisma.jobAssignment.create({
          data: {
            jobId,
            applierId,
          },
        }),

        this.prisma.job.update({
          where: { id: jobId },
          data: { status: JobStatus.PENDING },
        }),
      ]);

      return {
        success: true,
        message: 'Job assigned successfully',
        data: {
          assignmentId: assignment.id,
          jobStatus: updatedJob.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to assign job ${jobId} to user ${applierId}`,
        error.stack,
      );

      // Crucial: If the error is an HTTP exception we threw (like NotFound or Forbidden),
      // we want to pass that straight to the user instead of wrapping it in a 500.
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while assigning the job',
      );
    }
  }

  async submitJob(jobId: number, applierId: number) {
    try {
      this.logger.log(
        `User ${applierId} is submitting job ${jobId} for completion`,
      );

      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }
      if (job.status !== JobStatus.PENDING) {
        throw new BadRequestException(
          `Job is currently ${job.status} and cannot be submitted`,
        );
      }

      const assignment = await this.prisma.jobAssignment.findFirst({
        where: { jobId, applierId },
      });

      if (!assignment) {
        throw new ForbiddenException(
          'You do not have permission to submit this job',
        );
      }

      const updatedJob = await this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });

      return {
        success: true,
        message: 'Job submitted successfully',
        data: {
          jobId: updatedJob.id,
          jobStatus: updatedJob.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to submit job ${jobId} by user ${applierId}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to submit job');
    }
  }

  async approveJob(jobId: number, ownerId: number) {
    try {
      this.logger.log(
        `Owner ${ownerId} is approving job ${jobId} for completion`,
      );

      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundException(`Job with ID ${jobId} not found`);
      }
      if (job.ownerId !== ownerId) {
        throw new ForbiddenException(
          'You do not have permission to approve this job',
        );
      }
      if (job.status !== JobStatus.COMPLETED) {
        throw new BadRequestException(
          `Job is currently ${job.status} and cannot be approved`,
        );
      }

      const updatedJob = await this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.APPROVED },
      });

      return {
        success: true,
        message: 'Job approved successfully',
        data: {
          jobId: updatedJob.id,
          jobStatus: updatedJob.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve job ${jobId} by owner ${ownerId}`,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to submit job');
    }
  }
}
