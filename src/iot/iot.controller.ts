import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { GetUser } from 'src/auth/get-user.decorator';
import { CreateIoTDeviceDto } from './dto/create-iot-device.dto';
import { IoTService } from './iot.service';

@UseGuards(AuthGuard('jwt'))
@Controller('iot')
export class IoTController {
    constructor(private readonly iotService: IoTService) { }

    @Get()
    async getAllDevices() {
        return this.iotService.getAllDevices();
    }

    @Post()
    async createDevice(@GetUser() user: User, @Body() dto: CreateIoTDeviceDto) {
        return this.iotService.createDevice(user.id, dto);
    }

    @Delete(':id')
    async removeDevice(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
        return this.iotService.removeDevice(user.id, id);
    }
}
