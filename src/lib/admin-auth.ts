import { getCurrentUser } from './api-helpers'
import { AppError } from './app-error'
import { ErrorCodes } from './error-codes'

export async function requireAdmin() {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'master') {
    throw new AppError(
      ErrorCodes.INSUFFICIENT_PERMISSIONS, 
      'Unauthorized - Administrator access required', 
      403
    )
  }
  
  return user
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'master'
}
