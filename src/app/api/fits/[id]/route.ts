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
    
    const fit = await prisma.fit.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!fit) {
      return NextResponse.json({ error: 'Fit not found' }, { status: 404 })
    }
    
    return NextResponse.json(fit)
  } catch (error) {
    console.error('GET fit error:', error)
    return NextResponse.json({ error: 'Failed to fetch fit' }, { status: 500 })
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
    
    const existing = await prisma.fit.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Fit not found' }, { status: 404 })
    }
    
    const fit = await prisma.fit.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        shipTypeId: body.shipTypeId ?? existing.shipTypeId,
        shipName: body.shipName ?? existing.shipName,
        modules: body.modules ?? existing.modules,
        dps: body.dps ?? existing.dps,
        tank: body.tank ?? existing.tank,
        cost: body.cost ?? existing.cost
      }
    })
    
    return NextResponse.json(fit)
  } catch (error) {
    console.error('PUT fit error:', error)
    return NextResponse.json({ error: 'Failed to update fit' }, { status: 500 })
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
    
    const existing = await prisma.fit.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Fit not found' }, { status: 404 })
    }
    
    await prisma.fit.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE fit error:', error)
    return NextResponse.json({ error: 'Failed to delete fit' }, { status: 500 })
  }
}
