import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const signatures = await prisma.explorationSignature.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(signatures)
  } catch (error) {
    console.error('GET exploration signatures error:', error)
    return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, type, status, systemId, systemName, notes, characterId } = body
    
    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const signature = await prisma.explorationSignature.create({
      data: {
        name,
        type,
        status: status || 'new',
        systemId,
        systemName,
        notes,
        characterId,
        userId: user.id
      }
    })
    
    return NextResponse.json(signature)
  } catch (error) {
    console.error('POST exploration signature error:', error)
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 })
  }
}
