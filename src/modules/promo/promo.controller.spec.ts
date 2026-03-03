import { Test, TestingModule } from '@nestjs/testing';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';
import { Types } from 'mongoose';
import { User } from '@/datasources/mongoose/User.schema';
import { AuthService } from '@/modules/auth/auth.service';
import { Reflector } from '@nestjs/core';
import CreatePromoDto from './dto/create-promo-in.dto';
import UpdatePromoDto from './dto/update-promo-in.dto';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';

const mockPromoService = {
  create: jest.fn(),
  findOwn: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
};

describe('PromoController', () => {
  let controller: PromoController;

  const mockUser = { _id: new Types.ObjectId() } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromoController],
      providers: [
        {
          provide: PromoService,
          useValue: mockPromoService,
        },
        {
          provide: AuthService,
          useValue: { getSession: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<PromoController>(PromoController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a promo code', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ discount: 10 }),
      };
      mockPromoService.create.mockResolvedValue(mockResult);

      const dto: CreatePromoDto = {
        discount: 10,
        code: 'PROMO10',
        globalLimit: 100,
        userLimit: 1,
      };
      const result = await controller.create(mockUser, dto);

      expect(mockPromoService.create).toHaveBeenCalledWith(
        mockUser._id.toString(),
        dto,
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('findOwn', () => {
    it('should query own promos', async () => {
      mockPromoService.findOwn.mockResolvedValue({
        data: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      const dto = {} as ClickHouseQueryDto;
      const result = (await controller.findOwn(mockUser, dto)) as {
        data: Array<object>;
      };

      expect(mockPromoService.findOwn).toHaveBeenCalledWith(
        mockUser._id.toString(),
        dto,
      );
      expect(result.data).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a promo code', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ discount: 15 }),
      };
      mockPromoService.update.mockResolvedValue(mockResult);

      const dto: UpdatePromoDto = { discount: 15 };
      const result = await controller.update(mockUser, 'promoId', dto);

      expect(mockPromoService.update).toHaveBeenCalledWith(
        'promoId',
        mockUser._id.toString(),
        dto,
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('deactivate', () => {
    it('should deactivate a promo code', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ inactiveAt: new Date() }),
      };
      mockPromoService.deactivate.mockResolvedValue(mockResult);

      const result = await controller.deactivate(mockUser, 'promoId');

      expect(mockPromoService.deactivate).toHaveBeenCalledWith(
        'promoId',
        mockUser._id.toString(),
      );
      expect(result.id).toBeDefined();
    });
  });
});
