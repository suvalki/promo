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
import { PromoService } from './promo.service';
import CreatePromoDto from './dto/create-promo-in.dto';
import UpdatePromoDto from './dto/update-promo-in.dto';
import PromoOutDto from './dto/promo-out.dto';
import PaginatedPromoStatOutDto from './dto/promo-stat-out.dto';
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

@ApiTags('Promo')
@ApiBearerAuth()
@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Auth()
  @Post()
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({
    status: 201,
    description: 'Promo code created',
    type: PromoOutDto,
  })
  @ZodSerializerDto(PromoOutDto)
  async create(@CurrentUser() user: User, @Body() dto: CreatePromoDto) {
    const promo = await this.promoService.create(user._id.toString(), dto);
    return {
      ...(promo.toObject ? promo.toObject() : promo),
      id: promo._id.toString(),
    };
  }

  @Auth()
  @Get()
  @ApiOperation({ summary: 'Find user promo codes with statistics' })
  @ApiResponse({
    status: 200,
    description: 'Paginated promo codes',
    type: PaginatedPromoStatOutDto,
  })
  @ZodSerializerDto(PaginatedPromoStatOutDto)
  async findOwn(
    @CurrentUser() user: User,
    @Query() queryDto: ClickHouseQueryDto,
  ) {
    return this.promoService.findOwn(user._id.toString(), queryDto);
  }

  @Auth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update promo code by ID' })
  @ApiResponse({
    status: 200,
    description: 'Promo code updated',
    type: PromoOutDto,
  })
  @ZodSerializerDto(PromoOutDto)
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePromoDto,
  ) {
    const promo = await this.promoService.update(id, user._id.toString(), dto);
    return {
      ...(promo.toObject ? promo.toObject() : promo),
      id: promo._id.toString(),
    };
  }

  @Auth()
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate promo code by ID' })
  @ApiResponse({
    status: 200,
    description: 'Promo code deactivated',
    type: PromoOutDto,
  })
  @ZodSerializerDto(PromoOutDto)
  async deactivate(@CurrentUser() user: User, @Param('id') id: string) {
    const promo = await this.promoService.deactivate(id, user._id.toString());
    return {
      ...(promo.toObject ? promo.toObject() : promo),
      id: promo._id.toString(),
    };
  }
}
