import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { User } from '@/datasources/mongoose/User.schema';
import { AppError } from '@/common/errors/app.error';

class MockUserModel {
  findOne = jest.fn();
  create = jest.fn();
  findById = jest.fn();
  findByIdAndUpdate = jest.fn();
}

class MockJwtService {
  signAsync = jest.fn();
  verifyAsync = jest.fn();
}

interface BunMock {
  password: {
    hash(password: string): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let model: MockUserModel;
  let jwt: MockJwtService;
  let bun: BunMock;

  const userId = new Types.ObjectId();
  const mockUser = new User();
  mockUser._id = userId;
  mockUser.email = 'test@example.com';
  mockUser.password = 'hashedPassword';
  mockUser.name = 'Test';
  mockUser.phone = '+1234567890';

  const signupDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test',
    phone: '+1234567890',
  };

  beforeEach(async () => {
    model = new MockUserModel();
    jwt = new MockJwtService();
    bun = {
      password: {
        hash: jest.fn().mockResolvedValue('hashedPassword'),
        verify: jest.fn().mockResolvedValue(true),
      },
    };

    Object.defineProperty(global, 'Bun', {
      value: bun,
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: model,
        },
        {
          provide: JwtService,
          useValue: jwt,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should successfully register a new user', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue(mockUser);

      const result = await service.signup(signupDto);

      expect(model.findOne).toHaveBeenCalled();
      expect(model.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw AppError if user already exists', async () => {
      model.findOne.mockResolvedValue(mockUser);

      await expect(service.signup(signupDto)).rejects.toThrow(AppError);
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      model.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
    });

    it('should throw Forbidden if user is banned', async () => {
      const bannedUser = new User();
      Object.assign(bannedUser, mockUser);
      bannedUser.bannedAt = new Date();
      model.findOne.mockResolvedValue(bannedUser);

      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(AppError);
    });

    it('should return null if password verify fails', async () => {
      model.findOne.mockResolvedValue(mockUser);

      jest.spyOn(bun.password, 'verify').mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'pw',
      );

      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should sign a token', async () => {
      jwt.signAsync.mockResolvedValue('token');

      const result = await service.createSession('userId');

      expect(jwt.signAsync).toHaveBeenCalled();
      expect(result).toBe('token');
    });
  });

  describe('getSession', () => {
    it('should return user if token is valid', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: userId.toHexString() });
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.getSession('validToken');

      expect(result).toEqual(mockUser);
    });

    it('should throw Forbidden if user is banned', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: userId.toHexString() });
      const bannedUser = new User();
      Object.assign(bannedUser, mockUser);
      bannedUser.bannedAt = new Date();
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(bannedUser),
      });

      await expect(service.getSession('token')).rejects.toThrow(AppError);
    });

    it('should return null if token verification fails', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const result = await service.getSession('invalidToken');

      expect(result).toBeNull();
    });
  });

  describe('forgotPassword', () => {
    it('should return token if user exists', async () => {
      model.findOne.mockResolvedValue(mockUser);
      jwt.signAsync.mockResolvedValue('resetToken');

      const result = await service.forgotPassword('test@example.com');

      expect(result).toBe('resetToken');
    });

    it('should return undefined if user not found', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    const resetDto = {
      token: 'resetToken',
      password: 'newPassword123',
    };

    it('should update password with valid reset token', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: userId.toHexString(),
        purpose: 'reset',
      });
      model.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.resetPassword(resetDto);

      expect(model.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw if purpose is not reset', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: userId.toHexString(),
        purpose: 'invalid',
      });

      await expect(service.resetPassword(resetDto)).rejects.toThrow(AppError);
    });

    it('should throw if token verification fails', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expire'));

      await expect(service.resetPassword(resetDto)).rejects.toThrow(AppError);
    });

    it('should throw NotFound if user no longer exists', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: userId.toHexString(),
        purpose: 'reset',
      });
      model.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(AppError);
    });
  });
});
