import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConsoleLogger,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import * as admin from 'firebase-admin';
import { SocialLoginDto } from './dto/social-login.dto';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class AuthService {
  // Store OTPs in memory (in production, use Redis)
  private otpStore = new Map<
    string,
    { otp: string; expiresAt: Date; userData?: any }
  >();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // Store OTP and user data temporarily
    this.otpStore.set(dto.email, {
      otp,
      expiresAt,
      userData: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Send OTP email
    await this.mailerService.sendOtp(dto.email, otp);

    return { message: 'OTP sent to your email' };
  }

  async verifyOtp(email: string, otp: string) {
    const stored = this.otpStore.get(email);

    if (!stored) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('OTP expired');
    }

    if (stored.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Create user
    const newUser = await this.prisma.user.create({
      data: stored.userData,
    });

    // Clean up OTP
    this.otpStore.delete(email);

    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const { password, ...result } = newUser;
    return { access_token: this.jwtService.sign(payload), result };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP for password reset
    this.otpStore.set(`reset_${email}`, {
      otp,
      expiresAt,
    });

    // Send OTP email
    await this.mailerService.sendOtp(email, otp);

    return { message: 'OTP sent to your email' };
  }

  async verifyResetOtp(email: string, otp: string) {
    const stored = this.otpStore.get(`reset_${email}`);

    if (!stored) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(`reset_${email}`);
      throw new BadRequestException('OTP expired');
    }

    if (stored.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    return { message: 'OTP verified' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    // Verify OTP first
    await this.verifyResetOtp(email, otp);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Clean up OTP
    this.otpStore.delete(`reset_${email}`);

    return { message: 'Password reset successful' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: fullName || user.firstName || '',
        avatar: user.avatar,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
      },
    };
  }

  async socialLogin(dto: SocialLoginDto) {
    let decoded: admin.auth.DecodedIdToken;

    try {
      decoded = await admin.auth().verifyIdToken(dto.idToken);
    } catch (_) {
      throw new UnauthorizedException('Invalid token');
    }

    const email = decoded.email;
    if (!email) {
      throw new UnauthorizedException('Email not available');
    }

    const name = decoded.name ?? '';
    const nameParts = name.trim().split(' ').filter(Boolean);
    const firstName = decoded.given_name ?? nameParts[0] ?? null;
    const lastName =
      decoded.family_name ??
      (nameParts.length > 1 ? nameParts.slice(1).join(' ') : null);
    const avatar = decoded.picture ?? null;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash(
            await bcrypt
              .genSalt(10)
              .then((salt) => `${dto.provider}:${decoded.uid}:${salt}`),
            10,
          ),
          firstName,
          lastName,
          avatar,
        },
      }));

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        fullName: fullName || user.firstName || '',
        role: user.role,
        isProfileComplete: user.isProfileComplete,
        avatar: user.avatar,
      },
    };
  }
}
