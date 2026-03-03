import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessages } from '@/common/errors/error-codes';

export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: unknown,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    const finalMessage = message || ErrorMessages[code];

    super(
      {
        success: false,
        error: {
          code,
          message: finalMessage,
          details: details ?? undefined,
        },
      },
      status,
    );
  }

  static BadRequest(code: ErrorCode, message?: string, details?: unknown) {
    return new AppError(code, message, details, HttpStatus.BAD_REQUEST);
  }

  static Unauthorized(
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    message?: string,
  ) {
    return new AppError(code, message, undefined, HttpStatus.UNAUTHORIZED);
  }

  static Forbidden(code: ErrorCode = ErrorCode.FORBIDDEN, message?: string) {
    return new AppError(code, message, undefined, HttpStatus.FORBIDDEN);
  }

  static NotFound(code: ErrorCode = ErrorCode.NOT_FOUND, message?: string) {
    return new AppError(code, message, undefined, HttpStatus.NOT_FOUND);
  }

  static Internal(message?: string, details?: unknown) {
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      details,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
