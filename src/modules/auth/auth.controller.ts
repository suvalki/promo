import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { User } from '@/datasources/mongoose/User.schema';
import { ZodSerializerDto } from 'nestjs-zod';
import { AppError } from '@/common/errors/app.error';
import { Auth } from './auth.decorator';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';
import AuthInDto from './dto/auth-in.dto';
import AuthOutDto from './dto/auth-out.dto';
import ForgotPasswordDto from './dto/forgot-password-in.dto';
import ForgotPasswordOutDto from './dto/forgot-password-out.dto';
import SignupDto from './dto/signup-in.dto';
import ResetPasswordDto from './dto/reset-password-in.dto';
import { ErrorCode } from '@/common/errors/error-codes';
import { Throttle } from '@nestjs/throttler';
import { AppThrottlerGuard } from '@/common/guards/throttler.guard';
import { UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AppThrottlerGuard)
  @Throttle({ auth: {} })
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthOutDto,
  })
  @ZodSerializerDto(AuthOutDto)
  async signup(@Body() dto: SignupDto) {
    const user = await this.authService.signup(dto);
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
    };
  }

  @UseGuards(AppThrottlerGuard)
  @Throttle({ auth: {} })
  @Post('login')
  @ApiOperation({ summary: 'Log in and get session cookie' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthOutDto,
  })
  @ZodSerializerDto(AuthOutDto)
  async login(
    @Body() body: AuthInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw AppError.Unauthorized(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const token = await this.authService.createSession(String(user._id));

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
    };
  }

  @Post('logout')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out user' })
  @ApiResponse({ status: 200, description: 'Successful logout' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    return { success: true };
  }

  @UseGuards(AppThrottlerGuard)
  @Throttle({ auth: {} })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset token' })
  @ApiResponse({
    status: 201,
    description: 'Token generated',
    type: ForgotPasswordOutDto,
  })
  @ZodSerializerDto(ForgotPasswordOutDto)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const token = await this.authService.forgotPassword(dto.email);
    return {
      message: 'If user exists, a reset token has been generated',
      token: process.env.NODE_ENV !== 'production' ? token : undefined,
    };
  }

  @UseGuards(AppThrottlerGuard)
  @Throttle({ auth: {} })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 201, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { success: true };
  }

  @Get('me')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved',
    type: AuthOutDto,
  })
  @ZodSerializerDto(AuthOutDto)
  me(@CurrentUser() user: User) {
    if (!user) {
      throw AppError.Unauthorized();
    }
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
    };
  }
}
