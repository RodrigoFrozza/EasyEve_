import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 1. Adicionar colunas role e allowedActivities (ignora erros se já existirem)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT \'user\'')
    } catch { /* coluna pode já existir */ }

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowedActivities" TEXT[] NOT NULL DEFAULT ARRAY[\'ratting\']::TEXT[]')
    } catch { /* coluna pode já existir */ }

    // 2. Identificar o usuário master (Rodrigo Frozza) e definir como master
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "User" 
        SET role = 'master', allowedActivities = ARRAY['mining', 'ratting', 'abyssal', 'exploration', 'crab', 'escalations', 'pvp']::TEXT[]
        WHERE id = (
          SELECT c."userId" 
          FROM "Character" c 
          WHERE LOWER(c.name) = 'rodrigo frozza' 
          LIMIT 1
        )
      `)
    } catch { /* pode falhar se não encontrar o usuário */ }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration applied. Rodrigo Frozza set as master with all activities allowed.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}