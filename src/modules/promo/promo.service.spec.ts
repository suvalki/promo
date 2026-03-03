import { AppError } from '@/common/errors/app.error';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import CreatePromoDto from './dto/create-promo-in.dto';
import UpdatePromoDto from './dto/update-promo-in.dto';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';
import { PromoService } from './promo.service';

class MockPromoModel {
  static findById = jest.fn();
  constructor(public data: any) {
    Object.assign(this, data);
  }
  save = jest.fn().mockResolvedValue(this);
}

const mockClickhouseClient = {
  query: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('PromoService', () => {
  let service: PromoService;
  const userId = new Types.ObjectId().toString();
  const anotherUserId = new Types.ObjectId().toString();
  const promoId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoService,
        {
          provide: getModelToken(Promo.name),
          useValue: MockPromoModel,
        },
        {
          provide: CLICKHOUSE_CLIENT,
          useValue: mockClickhouseClient,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<PromoService>(PromoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a promo code and invalidate cache', async () => {
      const dto: CreatePromoDto = {
        code: 'PROMO10',
        discount: 10,
        globalLimit: 100,
        userLimit: 1,
      };

      const result = await service.create(userId, dto);

      expect(result.code).toBe(dto.code);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing promo code', async () => {
      const existingPromo = {
        _id: promoId,
        createdBy: { _id: new Types.ObjectId(userId) },
        save: jest.fn().mockResolvedValue(true),
      };
      MockPromoModel.findById.mockResolvedValue(existingPromo);

      const dto: UpdatePromoDto = { discount: 15 };
      const result = await service.update(promoId, userId, dto);

      expect(existingPromo.save).toHaveBeenCalled();
      expect(result.discount).toBe(15);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should throw NotFound if promo does not exist', async () => {
      MockPromoModel.findById.mockResolvedValue(null);

      const dto: UpdatePromoDto = {};
      await expect(service.update(promoId, userId, dto)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw Forbidden if user is not the creator', async () => {
      const existingPromo = {
        _id: promoId,
        createdBy: { _id: new Types.ObjectId(anotherUserId) },
      };
      MockPromoModel.findById.mockResolvedValue(existingPromo);

      const dto: UpdatePromoDto = {};
      await expect(service.update(promoId, userId, dto)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate the promo code', async () => {
      const existingPromo = {
        _id: promoId,
        createdBy: { _id: new Types.ObjectId(userId) },
        save: jest.fn().mockResolvedValue(true),
        inactiveAt: null,
      };
      MockPromoModel.findById.mockResolvedValue(existingPromo);

      const result = await service.deactivate(promoId, userId);

      expect(existingPromo.save).toHaveBeenCalled();
      expect(result.inactiveAt).not.toBeNull();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should throw NotFound if promo does not exist', async () => {
      MockPromoModel.findById.mockResolvedValue(null);

      await expect(service.deactivate(promoId, userId)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw Forbidden if user is not the creator', async () => {
      const existingPromo = {
        _id: promoId,
        createdBy: { _id: new Types.ObjectId(anotherUserId) },
      };
      MockPromoModel.findById.mockResolvedValue(existingPromo);

      await expect(service.deactivate(promoId, userId)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('findOwn', () => {
    it('should return cached stats if available', async () => {
      const cachedData = { data: [], totalCount: 0 };
      mockCacheManager.get.mockResolvedValue(cachedData);

      const dto = {} as ClickHouseQueryDto;
      const result = await service.findOwn(userId, dto);

      expect(result).toBe(cachedData);
      expect(mockClickhouseClient.query).not.toHaveBeenCalled();
    });

    it('should run clickhouse query if cache is empty', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const mockDataResultSet = {
        json: jest.fn().mockResolvedValue([]),
      };
      const mockCountResultSet = {
        json: jest.fn().mockResolvedValue([[{ total: '0' }]]),
      };

      mockClickhouseClient.query
        .mockResolvedValueOnce(mockDataResultSet)
        .mockResolvedValueOnce(mockCountResultSet);

      const dto = {} as ClickHouseQueryDto;
      const result = (await service.findOwn(userId, dto)) as {
        data: Array<object>;
        totalCount: number;
      };

      expect(mockClickhouseClient.query).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});
