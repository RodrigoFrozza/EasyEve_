import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

export async function POST(request: Request) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    if (!body.data || (!body.data.activities && !body.data.fits)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    const { activities = [], fits = [] } = body.data

    // Import activities
    const activityCount = activities.length
    if (activityCount > 0) {
      const activitiesToCreate = activities.map((a: any) => {
        const { id, userId, createdAt, updatedAt, ...rest } = a
        return {
          ...rest,
          userId: user.id,
          // Convert date strings back to Date objects if they exist
          startTime: rest.startTime ? new Date(rest.startTime) : new Date(),
          endTime: rest.endTime ? new Date(rest.endTime) : undefined,
        }
      })
      await prisma.activity.createMany({ data: activitiesToCreate })
    }

    // Import fits
    const fitCount = fits.length
    if (fitCount > 0) {
      const fitsToCreate = fits.map((f: any) => {
        const { id, userId, createdAt, updatedAt, ...rest } = f
        return {
          ...rest,
          userId: user.id
        }
      })
      await prisma.fit.createMany({ data: fitsToCreate })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Imported ${activityCount} activities and ${fitCount} fits.` 
    })
  } catch (error) {
    console.error('Data import error:', error)
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 })
  }
}
