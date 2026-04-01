import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessions = await prisma.rattingSession.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'desc' }
    })
    
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('GET ratting sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch ratting sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { startTime, endTime, siteType, bounty, sitesCompleted, characterId } = body
    
    const session = await prisma.rattingSession.create({
      data: {
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        siteType,
        bounty: bounty || 0,
        sitesCompleted: sitesCompleted || 0,
        characterId,
        userId: user.id
      }
    })
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('POST ratting session error:', error)
    return NextResponse.json({ error: 'Failed to create ratting session' }, { status: 500 })
  }
}
