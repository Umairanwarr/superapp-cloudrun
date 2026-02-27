import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { IoTController } from './iot.controller';
import { IoTService } from './iot.service';

@Module({
    imports: [PrismaModule],
    controllers: [IoTController],
    providers: [IoTService],
})
export class IoTModule { }
