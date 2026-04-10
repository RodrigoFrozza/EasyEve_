export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCorporationWalletJournal } from '@/lib/esi'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  try {
    // 1. Find a manager character
    const managerChar = await prisma.character.findFirst({
      where: { 
        OR: [
          { isCorpManager: true },
          { name: 'Zeca Setaum' }
        ]
      }
    })

    if (!managerChar) {
      return NextResponse.json({ 
        error: 'Nenhum personagem Gestor de Corporação encontrado. Por favor, marque um personagem como "Corp Manager" no perfil.' 
      }, { status: 404 })
    }

    // Get character public info to get corp ID
    const charInfoRes = await fetch(`https://esi.evetech.net/latest/characters/${managerChar.id}/`)
    if (!charInfoRes.ok) {
      return NextResponse.json({ error: `Erro ao consultar personagem na ESI: ${charInfoRes.statusText}` }, { status: 502 })
    }
    const charInfo = await charInfoRes.json()
    const corpId = charInfo.corporation_id

    if (!corpId) {
      return NextResponse.json({ error: 'Não foi possível determinar o ID da corporação para este personagem.' }, { status: 500 })
    }

    // 2. Fetch Journal
    let journal
    try {
      journal = await getCorporationWalletJournal(corpId, managerChar.id)
    } catch (esiErr: any) {
      console.error('ESI Journal Error:', esiErr)
      const isScopeError = esiErr.message?.includes('403') || esiErr.toString().includes('403')
      return NextResponse.json({ 
        error: isScopeError 
          ? `O personagem ${managerChar.name} não possui as permissões (scopes) necessárias para ler o jornal da corporação. Re-logue o personagem autorizando todos os scopes.`
          : `Erro na ESI ao buscar jornal: ${esiErr.message || 'Erro desconhecido'}`
      }, { status: 502 })
    }
    
    // 3. Process entries
    let newPaymentsCount = 0
    
    for (const entry of journal) {
      if (entry.ref_type !== 'player_donation' && entry.ref_type !== 10) continue
      if (entry.amount <= 0) continue 

      const existing = await prisma.payment.findUnique({
        where: { journalId: entry.id.toString() }
      })
      if (existing) continue

      const payerChar = await prisma.character.findUnique({
        where: { id: entry.first_party_id },
        select: { userId: true, name: true }
      })

      await prisma.payment.create({
        data: {
          userId: payerChar?.userId || (await prisma.user.findFirst({ where: { role: 'master' } }))?.id || '',
          amount: entry.amount,
          payerCharacterId: entry.first_party_id,
          payerCharacterName: payerChar?.name || entry.description || 'Unknown',
          journalId: entry.id.toString(),
          status: 'pending',
          createdAt: new Date(entry.date)
        }
      })
      newPaymentsCount++
    }

    return NextResponse.json({ 
      success: true, 
      newPaymentsCount,
      manager: managerChar.name,
      corpId
    })
  } catch (error: any) {
    console.error('Final sync error:', error)
    return NextResponse.json({ error: error.message || 'Erro interno na sincronização' }, { status: 500 })
  }
}
