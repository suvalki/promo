import { User } from '@/datasources/mongoose/User.schema';
import { Injectable } from '@nestjs/common';
import { AppError } from '@/common/errors/app.error';
import { ErrorCode } from '@/common/errors/error-codes';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import SignupDto from './dto/signup-in.dto';
import ResetPasswordDto from './dto/reset-password-in.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly user: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<User> {
    const existing = await this.user.findOne({
      $or: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw AppError.BadRequest(
        ErrorCode.USER_ALREADY_EXISTS,
        'Пользователь с таким email или телефоном уже существует',
      );
    }

    const passwordHash = await Bun.password.hash(dto.password);
    return this.user.create({
      ...dto,
      password: passwordHash,
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.user.findOne({ email });
    if (user && (await Bun.password.verify(password, user.password))) {
      if (user.bannedAt) {
        throw AppError.Forbidden(ErrorCode.ACCOUNT_BANNED);
      }
      return user;
    }
    return null;
  }

  async createSession(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }

  async getSession(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.user.findById(payload.sub).exec();

      if (user?.bannedAt) {
        throw AppError.Forbidden(ErrorCode.ACCOUNT_BANNED);
      }

      return user;
    } catch (e) {
      if (e instanceof AppError) throw e;
      return null;
    }
  }

  async forgotPassword(email: string) {
    const user = await this.user.findOne({ email });
    if (!user) return;

    const resetToken = await this.jwtService.signAsync(
      { sub: String(user._id), purpose: 'reset' },
      { expiresIn: '1h' },
    );

    console.log(`Reset token for ${email}: ${resetToken}`);
    return resetToken;
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        purpose: string;
      }>(dto.token);

      if (payload.purpose !== 'reset') {
        throw AppError.BadRequest(ErrorCode.AUTH_INVALID_TOKEN);
      }

      const passwordHash = await Bun.password.hash(dto.password);
      const user = await this.user.findByIdAndUpdate(payload.sub, {
        password: passwordHash,
      });

      if (!user) {
        throw AppError.NotFound(ErrorCode.NOT_FOUND);
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw AppError.BadRequest(ErrorCode.AUTH_INVALID_TOKEN);
    }
  }
}
