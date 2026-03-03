export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  ACCOUNT_BANNED = 'ACCOUNT_BANNED',
  RATE_LIMITED = 'RATE_LIMITED',
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'Пользователь не авторизован',
  [ErrorCode.FORBIDDEN]: 'Доступ запрещен',
  [ErrorCode.NOT_FOUND]: 'Ресурс не найден',
  [ErrorCode.VALIDATION_FAILED]: 'Ошибка валидации',
  [ErrorCode.BAD_REQUEST]: 'Некорректный запрос',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Внутренняя ошибка сервера',
  [ErrorCode.USER_ALREADY_EXISTS]: 'Пользователь с таким email уже существует',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Неверный email или пароль',
  [ErrorCode.AUTH_INVALID_TOKEN]: 'Неверный или просроченный токен',
  [ErrorCode.ACCOUNT_BANNED]: 'Ваш аккаунт заблокирован',
  [ErrorCode.RATE_LIMITED]: 'Слишком много запросов. Попробуйте позже',
};
