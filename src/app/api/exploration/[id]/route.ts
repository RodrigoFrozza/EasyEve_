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
    
    const signature = await prisma.explorationSignature.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!signature) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }
    
    return NextResponse.json(signature)
  } catch (error) {
    console.error('GET signature error:', error)
    return NextResponse.json({ error: 'Failed to fetch signature' }, { status: 500 })
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
    
    const existing = await prisma.explorationSignature.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }
    
    const signature = await prisma.explorationSignature.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        status: body.status ?? existing.status,
        systemId: body.systemId ?? existing.systemId,
        systemName: body.systemName ?? existing.systemName,
        notes: body.notes ?? existing.notes
      }
    })
    
    return NextResponse.json(signature)
  } catch (error) {
    console.error('PUT signature error:', error)
    return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 })
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
    
    const existing = await prisma.explorationSignature.findFirst({
      where: { id, userId: user.id }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }
    
    await prisma.explorationSignature.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE signature error:', error)
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 })
  }
}
