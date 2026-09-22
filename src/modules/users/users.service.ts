import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto.js';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RedisService } from '../../integrations/redis/redis.service.js';
import { MailService } from '../../integrations/mail/mail.service.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async sendOtp(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.redisService.setOtp(email, otp);

    await this.mailService.sendOtpEmail(email, otp);

    return otp;
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
    where: {
      email: createUserDto.email,
    },
  });

  if (existingUser) {
    throw new BadRequestException('Email already exists');
  }


    await this.sendOtp(createUserDto.email);

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        email: createUserDto.email,
        password: hashedPassword,
      },
    });

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'User created successfully, OTP send register email address please verify your account first',
      data: userWithoutPassword,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
  const { email, otp } = verifyOtpDto;

  const storedOtp = await this.redisService.getOtp(email);

  if (!storedOtp) {
    return {
      message: 'OTP expired or not found',
    };
  }

  if (storedOtp !== otp) {
    return {
      message: 'Invalid OTP',
    };
  }

  await this.redisService.deleteOtp(email);

  // Email verified
  const user = await this.prisma.user.update({
    where: {
      email,
    },
    data: {
      email_verified: true,
    },
  });

  const { password, ...userWithoutPassword } = user;

  return {
    message: 'Email verified successfully',
    data: userWithoutPassword,
  };
}

async signIn(loginDto: LoginDto) {
  const { email, password } = loginDto;

  const user = await this.prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return {
      message: 'Invalid email or password',
    };
  }

  if (!user.email_verified) {
    return {
      message: 'Please verify your email before signing in',
    };
  }

  if (!user.is_active) {
    return {
      message: 'User account is inactive',
    };
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password,
  );

  if (!passwordMatch) {
    return {
      message: 'Invalid email or password',
    };
  }

  const token = await this.jwtService.signAsync({
    sub: user.id,
    email: user.email,
  });


  const { password: _, ...userWithoutPassword } = user;

  return {
    message: 'Sign in successful',
    data: userWithoutPassword,
    token,
  };
}

}