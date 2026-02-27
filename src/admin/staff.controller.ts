import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StaffService } from './staff.service';

import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class AddStaffDto {
    @IsInt()
    @Type(() => Number)
    userId: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    propertyId?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    hotelId?: number;
}

@Controller('admin/staff')
@UseGuards(AuthGuard('jwt'))
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    /** GET /admin/staff — all staff */
    @Get()
    getAllStaff() {
        return this.staffService.getAllStaff();
    }

    /** GET /admin/staff/assign?q=search — staff list for job assignment picker */
    @Get('assign')
    getStaffForAssignment(@Query('q') q?: string) {
        return this.staffService.getStaffForAssignment(q);
    }

    /** POST /admin/staff — add a user as staff */
    @Post()
    addStaff(@Body() dto: AddStaffDto) {
        return this.staffService.addStaff({
            userId: +dto.userId,
            propertyId: dto.propertyId ? +dto.propertyId : undefined,
            hotelId: dto.hotelId ? +dto.hotelId : undefined,
        });
    }

    /** DELETE /admin/staff/:id — remove a staff member */
    @Delete(':id')
    removeStaff(@Param('id') id: string) {
        return this.staffService.removeStaff(+id);
    }
}
