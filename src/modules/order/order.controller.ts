import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import CreateOrderInDto from './dto/create-order-in.dto';
import UpdateOrderInDto from './dto/update-order-in.dto';
import ApplyPromoInDto from './dto/apply-promo-in.dto';
import OrderOutDto from './dto/order-out.dto';
import PaginatedOrderListOutDto from './dto/order-list-out.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Auth } from '@/modules/auth/auth.decorator';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { User } from '@/datasources/mongoose/User.schema';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Auth()
  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created', type: OrderOutDto })
  @ZodSerializerDto(OrderOutDto)
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderInDto) {
    const order = await this.orderService.create(user._id.toString(), dto);
    return {
      ...(order.toObject ? order.toObject() : order),
      id: order._id.toString(),
    };
  }

  @Auth()
  @Get()
  @ApiOperation({ summary: 'List user orders' })
  @ApiResponse({
    status: 200,
    description: 'Paginated user orders',
    type: PaginatedOrderListOutDto,
  })
  @ZodSerializerDto(PaginatedOrderListOutDto)
  async findOwn(
    @CurrentUser() user: User,
    @Query() queryDto: ClickHouseQueryDto,
  ) {
    return this.orderService.findOwn(user._id.toString(), queryDto);
  }

  @Auth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing order' })
  @ApiResponse({ status: 200, description: 'Order updated', type: OrderOutDto })
  @ZodSerializerDto(OrderOutDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOrderInDto,
  ) {
    const order = await this.orderService.update(id, user._id.toString(), dto);
    return {
      ...(order.toObject ? order.toObject() : order),
      id: order._id.toString(),
    };
  }

  @Auth()
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate an order' })
  @ApiResponse({
    status: 200,
    description: 'Order deactivated',
    type: OrderOutDto,
  })
  @ZodSerializerDto(OrderOutDto)
  async deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    const order = await this.orderService.deactivate(id, user._id.toString());
    return {
      ...(order.toObject ? order.toObject() : order),
      id: order._id.toString(),
    };
  }

  @Auth()
  @Post(':id/apply-promocode')
  @ApiOperation({ summary: 'Apply a promocode to an order' })
  @ApiResponse({
    status: 200,
    description: 'Promocode applied',
    type: OrderOutDto,
  })
  @ZodSerializerDto(OrderOutDto)
  async applyPromocode(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ApplyPromoInDto,
  ) {
    const order = await this.orderService.applyPromocode(
      id,
      user._id.toString(),
      dto.code,
    );
    return {
      ...(order.toObject ? order.toObject() : order),
      id: order._id.toString(),
    };
  }
}
