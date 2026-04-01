import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    const session = await prisma.rattingSession.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('GET ratting session error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const body = await request.json()
    
    const existing = await prisma.rattingSession.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    const session = await prisma.rattingSession.update({
      where: { id },
      data: {
        endTime: body.endTime ? new Date(body.endTime) : existing.endTime,
        siteType: body.siteType ?? existing.siteType,
        bounty: body.bounty ?? existing.bounty,
        sitesCompleted: body.sitesCompleted ?? existing.sitesCompleted
      }
    })
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('PUT ratting session error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    const existing = await prisma.rattingSession.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    await prisma.rattingSession.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE ratting session error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
