import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

export const IS_PUBLIC_KEY = 'isPublic';

export const Auth = (isPublic = false) =>
  applyDecorators(SetMetadata(IS_PUBLIC_KEY, isPublic), UseGuards(AuthGuard));
