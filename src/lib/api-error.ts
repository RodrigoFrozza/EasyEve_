import { ErrorCodes, type ErrorCode } from './error-codes'
import { AppError, isAppError, getErrorCode } from './app-error'

interface ApiResponse<T = unknown> {
  data?: T
  error?: AppError
}

interface FetchOptions extends RequestInit {
  timeout?: number
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  async get<T = unknown>(url: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  async post<T = unknown>(url: string, body?: unknown, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T = unknown>(url: string, body?: unknown, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T = unknown>(url: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  private async request<T>(url: string, options?: FetchOptions): Promise<ApiResponse<T>> {
    const { timeout, ...fetchOptions } = options || {}
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`

    const controller = new AbortController()
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null

    try {
      const response = await fetch(fullURL, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        const error = this.mapHttpError(response)
        return { error }
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        return { data: data as T }
      }

      const data = await response.text()
      try {
        return { data: JSON.parse(data) as T }
      } catch {
        return { data: data as unknown as T }
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)

      const error = this.mapFetchError(err)
      return { error }
    }
  }

  private mapHttpError(response: Response): AppError {
    const status = response.status

    switch (status) {
      case 400:
        return new AppError(ErrorCodes.VALIDATION_FAILED, 'Dados inválidos', 400)
      case 401:
        return new AppError(ErrorCodes.API_UNAUTHORIZED, 'Não autorizado', 401)
      case 403:
        return new AppError(ErrorCodes.API_FORBIDDEN, 'Acesso negado', 403)
      case 404:
        return new AppError(ErrorCodes.API_NOT_FOUND, 'Recurso não encontrado', 404)
      case 500:
      case 502:
      case 503:
        return new AppError(ErrorCodes.API_SERVER_ERROR, 'Erro interno do servidor', status)
      default:
        return new AppError(ErrorCodes.API_FETCH_FAILED, `Erro HTTP: ${status}`, status)
    }
  }

  private mapFetchError(error: unknown): AppError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new AppError(ErrorCodes.API_FETCH_FAILED, 'Tempo limite excedido', 408)
      }
      return new AppError(ErrorCodes.API_FETCH_FAILED, error.message)
    }
    return new AppError(ErrorCodes.API_FETCH_FAILED, 'Erro desconhecido')
  }
}

export const apiClient = new ApiClient()

export function extractErrorCode(error: unknown): ErrorCode | null {
  if (isAppError(error)) {
    return error.code
  }

  if (error instanceof Response) {
    if (!error.ok) {
      switch (error.status) {
        case 401:
          return ErrorCodes.API_UNAUTHORIZED
        case 403:
          return ErrorCodes.API_FORBIDDEN
        case 404:
          return ErrorCodes.API_NOT_FOUND
        default:
          return ErrorCodes.API_FETCH_FAILED
      }
    }
  }

  return getErrorCode(error)
}

export { AppError } from './app-error'
export { ErrorCodes } from './error-codes'
export type { ErrorCode } from './error-codes'