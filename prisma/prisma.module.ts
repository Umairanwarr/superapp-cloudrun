import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <--- THIS IS KEY. It makes Prisma available to Auth, Users, Hotels, etc.
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // We export it so others can use it
})
export class PrismaModule {}
