import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  async findAll({ q }: { q?: string } = {}) {
    const query = (q ?? '').trim();

    const users = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ createdAt: 'desc' }],
    });

    return users.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = u;
      return result;
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }

  async updateFcmToken(userId: number, fcmToken: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    const { password, ...result } = user;
    return result;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const {
      fullName,
      firstName,
      lastName,
      email,
      phoneNumber,
      avatar,
      gender,
      currency,
      language,
      latitude,
      longitude,
      address,
      fcmToken,
      isProfileComplete,
      isActive,
    } = updateUserDto as any;

    const data: any = {};
    if (fullName) data.fullName = fullName;
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (email) data.email = email;
    if (phoneNumber) data.phoneNumber = phoneNumber;
    if (avatar) data.avatar = avatar;
    if (gender) data.gender = gender;
    if (currency) data.currency = currency;
    if (language) data.language = language;
    if (latitude) data.latitude = latitude;
    if (longitude) data.longitude = longitude;
    if (address) data.address = address;
    if (fcmToken) data.fcmToken = fcmToken;
    if (isProfileComplete !== undefined)
      data.isProfileComplete = isProfileComplete;
    if (isActive !== undefined) data.isActive = isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data: data,
    });
    const { password, ...result } = user;
    return result;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
