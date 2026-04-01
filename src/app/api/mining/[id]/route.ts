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
    
    const session = await prisma.miningSession.findFirst({
      where: {
        id,
        userId: user.id
      }
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('GET mining session error:', error)
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
    
    const existing = await prisma.miningSession.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    const session = await prisma.miningSession.update({
      where: { id },
      data: {
        endTime: body.endTime ? new Date(body.endTime) : existing.endTime,
        systemId: body.systemId ?? existing.systemId,
        systemName: body.systemName ?? existing.systemName,
        oreType: body.oreType ?? existing.oreType,
        quantity: body.quantity ?? existing.quantity,
        estimatedIsk: body.estimatedIsk ?? existing.estimatedIsk
      }
    })
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('PUT mining session error:', error)
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
    
    const existing = await prisma.miningSession.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    await prisma.miningSession.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE mining session error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
