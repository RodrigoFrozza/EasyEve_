import { NextResponse } from 'next/server'
import { AppError, isAppError } from './app-error'
import { ErrorCodes } from './error-codes'
import { ZodError, ZodSchema } from 'zod'

export type ApiHandler = (req: Request, ...args: any[]) => Promise<Response | NextResponse | any>

/**
 * Higher-order function to wrap API handlers with centralized error handling.
 * Automatically catches AppErrors, ZodErrors, and generic Errors.
 */
export function withErrorHandling(handler: ApiHandler) {
  return async (req: Request, ...args: any[]) => {
    try {
      const response = await handler(req, ...args)
      
      // If the handler already returned a Response/NextResponse, return it
      if (response instanceof Response) {
        return response
      }
      
      // Otherwise, wrap the result in a JSON response
      return NextResponse.json(response)
    } catch (error) {
      console.error(`[API ERROR] ${req.method} ${req.url}:`, error)

      // Handle custom AppErrors
      if (isAppError(error)) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: error.code,
            details: error.details 
          }, 
          { status: error.statusCode }
        )
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: 'Dados de entrada inválidos', 
            code: ErrorCodes.VALIDATION_FAILED,
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          }, 
          { status: 400 }
        )
      }

      // Handle unexpected errors
      const isDev = process.env.NODE_ENV === 'development'
      return NextResponse.json(
        { 
          error: 'Erro interno do servidor', 
          code: ErrorCodes.API_SERVER_ERROR,
          details: isDev && error instanceof Error ? error.message : undefined,
          stack: isDev && error instanceof Error ? error.stack : undefined
        }, 
        { status: 500 }
      )
    }
  }
}

/**
 * Helper to validate request body with a Zod schema.
 * Throws ZodError on failure, which is caught by withErrorHandling.
 */
export async function validateBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      throw error
    }
    // Handle cases where body is not valid JSON
    throw new AppError(ErrorCodes.INVALID_INPUT, 'Corpo da requisição não é um JSON válido', 400)
  }
}

/**
 * Helper to validate search parameters with a Zod schema.
 */
export function validateParams<T>(url: string, schema: ZodSchema<T>): T {
  const { searchParams } = new URL(url)
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}
