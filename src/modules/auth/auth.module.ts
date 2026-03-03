import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '@/datasources/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/types/config.interface';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Config>) => ({
        secret: configService.get<string>('secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  exports: [AuthService],
})
export class AuthModule {}
