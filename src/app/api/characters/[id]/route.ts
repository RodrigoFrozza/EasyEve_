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
    const characterId = parseInt(id)
    
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId: user.id
      }
    })
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }
    
    return NextResponse.json(character)
  } catch (error) {
    console.error('GET character error:', error)
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 })
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
    const characterId = parseInt(id)
    
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId: user.id
      }
    })
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }
    
    await prisma.character.delete({
      where: { id: characterId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE character error:', error)
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
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
    const characterId = parseInt(id)
    const body = await request.json()
    
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId: user.id
      }
    })
    
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }
    
    const updated = await prisma.character.update({
      where: { id: characterId },
      data: {
        accessToken: body.accessToken ?? character.accessToken,
        refreshToken: body.refreshToken ?? character.refreshToken,
        tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : character.tokenExpiresAt
      }
    })
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT character error:', error)
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
  }
}
