import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from '@/datasources/mongoose/Order.schema';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { PromoUsage } from '@/datasources/mongoose/PromoUsage.schema';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisLockService } from '@/datasources/redis/redis-lock.service';
import { Types } from 'mongoose';
import { AppError } from '@/common/errors/app.error';
import CreateOrderInDto from './dto/create-order-in.dto';
import UpdateOrderInDto from './dto/update-order-in.dto';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';

class MockOrderModel {
  static findOne = jest.fn();
  constructor(public data: any) {
    Object.assign(this, data);
  }
  save = jest.fn().mockResolvedValue(this);
  toObject = jest.fn().mockReturnValue(this.data || this);
}

class MockPromoModel {
  static findOne = jest.fn();
}

class MockPromoUsageModel {
  static findOne = jest.fn();
  static countDocuments = jest.fn();
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

const mockRedisLockService = {
  acquire: jest.fn(),
};

const mockLock = {
  release: jest.fn(),
};

describe('OrderService', () => {
  let service: OrderService;
  const userId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getModelToken(Order.name),
          useValue: MockOrderModel,
        },
        {
          provide: getModelToken(Promo.name),
          useValue: MockPromoModel,
        },
        {
          provide: getModelToken(PromoUsage.name),
          useValue: MockPromoUsageModel,
        },
        {
          provide: CLICKHOUSE_CLIENT,
          useValue: mockClickhouseClient,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: RedisLockService,
          useValue: mockRedisLockService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const dto: CreateOrderInDto = { organicCost: 100 };
      const result = await service.create(userId, dto);

      expect(result.organicCost).toBe(100);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const existingOrder = {
        _id: orderId,
        user: { _id: new Types.ObjectId(userId) },
        organicCost: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      MockOrderModel.findOne.mockResolvedValue(existingOrder);

      const dto: UpdateOrderInDto = { organicCost: 150 };
      await service.update(orderId, userId, dto);

      expect(existingOrder.organicCost).toBe(150);
      expect(existingOrder.save).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should throw NotFound if order does not exist', async () => {
      MockOrderModel.findOne.mockResolvedValue(null);

      const dto = {} as UpdateOrderInDto;
      await expect(service.update(orderId, userId, dto)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('applyPromocode', () => {
    it('should apply a promocode to an order', async () => {
      mockRedisLockService.acquire.mockResolvedValue(mockLock);

      const existingOrder = {
        _id: new Types.ObjectId(orderId),
        user: { _id: new Types.ObjectId(userId) },
        organicCost: 100,
        toObject: jest.fn().mockReturnValue({}),
      };
      MockOrderModel.findOne.mockResolvedValue(existingOrder);

      MockPromoUsageModel.findOne.mockResolvedValue(null);

      const promo = {
        _id: new Types.ObjectId(),
        code: 'TEST',
        discount: 20,
        globalLimit: 100,
        userLimit: 2,
        toObject: jest.fn().mockReturnValue({}),
      };
      MockPromoModel.findOne.mockResolvedValue(promo);

      MockPromoUsageModel.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);

      const result = await service.applyPromocode(orderId, userId, 'TEST');

      expect(result).toBe(existingOrder);
      expect(mockLock.release).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should throw if promo is inactive or expired', async () => {
      mockRedisLockService.acquire.mockResolvedValue(mockLock);
      MockOrderModel.findOne.mockResolvedValue({});
      MockPromoUsageModel.findOne.mockResolvedValue(null);

      const promo = {
        _id: new Types.ObjectId(),
        inactiveAt: new Date(),
      };
      MockPromoModel.findOne.mockResolvedValue(promo);

      await expect(
        service.applyPromocode(orderId, userId, 'TEST'),
      ).rejects.toThrow(AppError);
      expect(mockLock.release).toHaveBeenCalled();
    });
  });

  describe('findOwn', () => {
    it('should return cached list if available', async () => {
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
