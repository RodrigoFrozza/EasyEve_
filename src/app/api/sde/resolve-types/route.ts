import { NextResponse } from 'next/server'
import { resolveTypeNames } from '@/lib/sde'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { typeIds } = body

    if (!typeIds || !Array.isArray(typeIds)) {
      return NextResponse.json({ error: 'typeIds array required' }, { status: 400 })
    }

    const names = await resolveTypeNames(typeIds)
    return NextResponse.json(names)
  } catch (error) {
    console.error('Error resolving type names:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
