import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { AppError } from '@/common/errors/app.error';
import { User } from '@/datasources/mongoose/User.schema';
import { Types } from 'mongoose';
import AuthInDto from './dto/auth-in.dto';
import SignupDto from './dto/signup-in.dto';
import ForgotPasswordDto from './dto/forgot-password-in.dto';
import ResetPasswordDto from './dto/reset-password-in.dto';

class MockAuthService {
  signup = jest.fn();
  validateUser = jest.fn();
  createSession = jest.fn();
  forgotPassword = jest.fn();
  resetPassword = jest.fn();
}

describe('AuthController', () => {
  let controller: AuthController;
  let service: MockAuthService;

  const userId = new Types.ObjectId();
  const mockUser = new User();
  mockUser._id = userId;
  mockUser.email = 'test@example.com';
  mockUser.name = 'Test';
  mockUser.phone = '+1234567890';
  mockUser.password = 'hashedPassword';

  const mockResponse: Partial<Response> = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(async () => {
    service = new MockAuthService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should call signup and return user info', async () => {
      service.signup.mockResolvedValue(mockUser);
      const dto: SignupDto = {
        email: 't@t.com',
        password: '123',
        name: 'test',
        phone: '+1234567890',
      };

      const result = await controller.signup(dto);

      expect(service.signup).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        id: mockUser._id.toHexString(),
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
      });
    });
  });

  describe('login', () => {
    const loginDto: AuthInDto = { email: 't@t.com', password: '123' };

    it('should call validateUser, createSession and set cookie', async () => {
      service.validateUser.mockResolvedValue(mockUser);
      service.createSession.mockResolvedValue('token');

      const result = await controller.login(loginDto, mockResponse as Response);

      expect(service.validateUser).toHaveBeenCalled();
      expect(service.createSession).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockUser._id.toHexString(),
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
      });
    });

    it('should throw Unauthorized if validation fails', async () => {
      service.validateUser.mockResolvedValue(null);

      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    it('should clear cookie', () => {
      const result = controller.logout(mockResponse as Response);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('token');
      expect(result).toEqual({ success: true });
    });
  });

  describe('forgotPassword', () => {
    it('should call forgotPassword and return message', async () => {
      service.forgotPassword.mockResolvedValue('token');
      const dto: ForgotPasswordDto = { email: 't@t.com' };

      const result = await controller.forgotPassword(dto);

      expect(service.forgotPassword).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should call resetPassword and return success', async () => {
      const dto: ResetPasswordDto = { token: 'token', password: 'new' };
      const result = await controller.resetPassword(dto);

      expect(service.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('me', () => {
    it('should return user info from request', () => {
      const result = controller.me(mockUser);

      expect(result).toEqual({
        id: mockUser._id.toHexString(),
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
      });
    });

    it('should throw Unauthorized if user missing in request', () => {
      const emptyUser = undefined as unknown as User;
      expect(() => controller.me(emptyUser)).toThrow(AppError);
    });
  });
});
