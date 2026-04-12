import { ErrorCode, ErrorCodes, getErrorMessage } from './error-codes'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public details?: string,
    public statusCode: number = 500
  ) {
    const message = details || getErrorMessage(code)
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, AppError)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (error instanceof AppError) {
    return error.code
  }
  if (error instanceof Error) {
    return mapErrorToCode(error)
  }
  return null
}

function mapErrorToCode(error: Error): ErrorCode {
  const name = error.name
  const message = error.message.toLowerCase()

  if (name === 'ChunkLoadError' || message.includes('loading chunk')) {
    return ErrorCodes.CHUNK_LOAD_ERROR
  }

  if (message.includes('token') && message.includes('expir')) {
    return ErrorCodes.ESI_TOKEN_EXPIRED
  }

  if (message.includes('token') && (message.includes('invalid') || message.includes('not a valid jwt'))) {
    return ErrorCodes.ESI_TOKEN_INVALID
  }

  if (message.includes('no valid access token') || message.includes('no valid token')) {
    return ErrorCodes.ESI_NO_TOKEN
  }

  if (message.includes('fetch') && message.includes('failed')) {
    return ErrorCodes.ESI_FETCH_FAILED
  }

  if (message.includes('oauth') || message.includes('token exchange')) {
    return ErrorCodes.OAUTH_EXCHANGE_FAILED
  }

  if (message.includes('not found')) {
    return ErrorCodes.API_NOT_FOUND
  }

  if (message.includes('unauthorized') || message.includes('não autorizado')) {
    return ErrorCodes.API_UNAUTHORIZED
  }

  if (message.includes('forbidden') || message.includes('acesso negado')) {
    return ErrorCodes.API_FORBIDDEN
  }

  if (message.includes('validation') || message.includes('validação')) {
    return ErrorCodes.VALIDATION_FAILED
  }

  return ErrorCodes.API_FETCH_FAILED
}

export function throwAppError(code: ErrorCode, details?: string, statusCode?: number): never {
  throw new AppError(code, details, statusCode)
}