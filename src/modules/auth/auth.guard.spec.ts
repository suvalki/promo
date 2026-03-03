import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AppError } from '@/common/errors/app.error';
import { User } from '@/datasources/mongoose/User.schema';
import { Types } from 'mongoose';

class MockAuthService {
  getSession = jest.fn();
}

class MockReflector {
  getAllAndOverride = jest.fn();
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let service: MockAuthService;
  let reflector: MockReflector;

  beforeEach(async () => {
    service = new MockAuthService();
    reflector = new MockReflector();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: service,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow public routes without token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const request = { cookies: {} };
      const context = new ExecutionContextHost([request]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw Unauthorized if no token and not public', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const request = { cookies: {} };
      const context = new ExecutionContextHost([request]);

      await expect(guard.canActivate(context)).rejects.toThrow(AppError);
    });

    it('should allow if token is valid', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const user = new User();
      user._id = new Types.ObjectId();
      service.getSession.mockResolvedValue(user);
      const request = { cookies: { token: 'valid' }, user: undefined };
      const context = new ExecutionContextHost([request]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toBe(user);
    });

    it('should throw Unauthorized if token is invalid', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      service.getSession.mockResolvedValue(null);
      const request = { cookies: { token: 'invalid' } };
      const context = new ExecutionContextHost([request]);

      await expect(guard.canActivate(context)).rejects.toThrow(AppError);
    });

    it('should allow public route even if token is invalid', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      service.getSession.mockResolvedValue(null);
      const request = { cookies: { token: 'invalid' } };
      const context = new ExecutionContextHost([request]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
