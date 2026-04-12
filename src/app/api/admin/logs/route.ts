import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorHandling } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async () => {
  await requireAdmin()

  // Auto-cleanup: remove logs older than 7 days
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    await prisma.debugLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    })
  } catch (cleanupError) {
    console.error('[CLEANUP] Failed to delete old logs:', cleanupError)
    // We continue even if cleanup fails
  }

  const logs = await prisma.debugLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: {
          name: true,
          accountCode: true
        }
      }
    }
  })

  return NextResponse.json(logs)
})
