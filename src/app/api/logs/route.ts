import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { level, message, stack, url, userAgent, context, characterId } = await req.json()

    // Restriction: Only Errors, never warnings or info
    if (level !== 'error') {
      return NextResponse.json({ success: true, message: 'Filtered by policy' })
    }

    // Save log
    await prisma.debugLog.create({
      data: {
        userId: session.user.id,
        characterId: characterId || session.user.characterId,
        level,
        message,
        stack,
        url,
        userAgent,
        context: context || {}
      }
    })

    // Restriction: 7-day retention (cleanup)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // We can run this async without awaiting if we want to improve response time, 
    // but a cleanup on every error is safe for now.
    await prisma.debugLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API/LOGS] Failed to save log:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
