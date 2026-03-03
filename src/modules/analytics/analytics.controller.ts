import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ZodSerializerDto } from 'nestjs-zod';
import { AnalyticsUserOutDto } from './dto/analytics-user-out.dto';
import { Auth } from '@/modules/auth/auth.decorator';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { User } from '@/datasources/mongoose/User.schema';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Контроллер аналитики.
 * Предоставляет HTTP-маршруты для получения аналитических данных приложения.
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@Auth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Получает аналитику по текущему авторизованному пользователю.
   * Возвращает профиль пользователя вместе с агрегированными данными из ClickHouse.
   *
   * @param {User} user - Текущий авторизованный пользователь (инжектируется через декоратор).
   * @returns Аналитические данные текущего пользователя.
   */
  @ApiOperation({ summary: 'get current user analytics' })
  @ApiResponse({
    status: 200,
    description: 'User analytics returned successfully',
    type: AnalyticsUserOutDto,
  })
  @Get('me')
  @ZodSerializerDto(AnalyticsUserOutDto)
  async getMe(@CurrentUser() user: User) {
    return this.analyticsService.getMe(user._id.toString());
  }
}
