import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, endTime } = body

    const existingActivity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(endTime && { endTime: new Date(endTime) })
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingActivity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    await prisma.activity.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}