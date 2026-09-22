import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sign-up')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.usersService.verifyOtp(verifyOtpDto);
  }

  @Post('sign-in')
  signIn(@Body() loginDto: LoginDto) {
    return this.usersService.signIn(loginDto);
  }

}