import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Types } from 'mongoose';
import { User } from '@/datasources/mongoose/User.schema';
import { AuthService } from '@/modules/auth/auth.service';
import { Reflector } from '@nestjs/core';
import CreateOrderInDto from './dto/create-order-in.dto';
import UpdateOrderInDto from './dto/update-order-in.dto';
import ApplyPromoInDto from './dto/apply-promo-in.dto';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';

const mockOrderService = {
  create: jest.fn(),
  findOwn: jest.fn(),
  update: jest.fn(),
  applyPromocode: jest.fn(),
};

describe('OrderController', () => {
  let controller: OrderController;

  const mockUser = { _id: new Types.ObjectId() } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
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

    controller = module.get<OrderController>(OrderController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ organicCost: 100 }),
      };
      mockOrderService.create.mockResolvedValue(mockResult);

      const dto: CreateOrderInDto = { organicCost: 100 };
      const result = await controller.create(mockUser, dto);

      expect(mockOrderService.create).toHaveBeenCalledWith(
        mockUser._id.toString(),
        dto,
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('findOwn', () => {
    it('should query own orders', async () => {
      mockOrderService.findOwn.mockResolvedValue({
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

      expect(mockOrderService.findOwn).toHaveBeenCalledWith(
        mockUser._id.toString(),
        dto,
      );
      expect(result.data).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ organicCost: 150 }),
      };
      mockOrderService.update.mockResolvedValue(mockResult);

      const dto: UpdateOrderInDto = { organicCost: 150 };
      const result = await controller.update('orderId', mockUser, dto);

      expect(mockOrderService.update).toHaveBeenCalledWith(
        'orderId',
        mockUser._id.toString(),
        dto,
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('applyPromocode', () => {
    it('should apply a promocode to an order', async () => {
      const mockResult = {
        _id: new Types.ObjectId(),
        toObject: jest
          .fn()
          .mockReturnValue({ organicCost: 100, appliedPromocode: 'PROMO10' }),
      };
      mockOrderService.applyPromocode.mockResolvedValue(mockResult);

      const dto: ApplyPromoInDto = { code: 'PROMO10' };
      const result = await controller.applyPromocode('orderId', mockUser, dto);

      expect(mockOrderService.applyPromocode).toHaveBeenCalledWith(
        'orderId',
        mockUser._id.toString(),
        'PROMO10',
      );
      expect(result.id).toBeDefined();
    });
  });
});
