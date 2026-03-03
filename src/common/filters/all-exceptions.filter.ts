import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode, ErrorMessages } from '@/common/errors/error-codes';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string = ErrorMessages[ErrorCode.INTERNAL_SERVER_ERROR];
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        if (
          resObj.error &&
          typeof resObj.error === 'object' &&
          (resObj.error as Record<string, unknown>).code
        ) {
          return response.status(status).json(resObj);
        }
        code =
          (resObj.code as string) ||
          HttpStatus[status] ||
          ErrorCode.INTERNAL_SERVER_ERROR;
        message =
          (resObj.message as string) ||
          ErrorMessages[code as ErrorCode] ||
          code;
        details = resObj.error || resObj.details || undefined;
      } else {
        message = typeof res === 'string' ? res : JSON.stringify(res);
        code = HttpStatus[status] || ErrorCode.INTERNAL_SERVER_ERROR;
      }
    } else if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      code = ErrorCode.VALIDATION_FAILED;
      message = ErrorMessages[ErrorCode.VALIDATION_FAILED];
      details = (exception.getZodError() as ZodError).issues;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }
}
