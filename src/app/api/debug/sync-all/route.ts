import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ESI_BASE_URL = 'https://esi.evetech.net/latest'

// Função para buscar nomes em lote (MUITO mais rápido)
async function fetchNamesInBulk(ids: number[]) {
  const res = await fetch(`${ESI_BASE_URL}/universe/names/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids)
  })
  if (!res.ok) return []
  return res.json()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    
    console.log(`🚀 Sincronizando Página ${page} de Itens do EVE...`)

    // 1. Pegar 1000 IDs de itens desta página
    const res = await fetch(`${ESI_BASE_URL}/universe/types/?page=${page}`)
    if (!res.ok) {
      return NextResponse.json({ status: 'Finished', message: 'Fim do universo alcançado!' })
    }
    const typeIds: number[] = await res.json()
    
    // 2. Traduzir os 1000 IDs para Nomes de uma vez só
    const nameData: { id: number, name: string, category: string }[] = await fetchNamesInBulk(typeIds)
    
    // 3. Garantir a existência do Grupo "Genérico" (Placeholder enquanto baixamos detalhes depois)
    const genericGroupId = 0 // Usaremos 0 como placeholder temporário para rapidez
    await prisma.eveCategory.upsert({
      where: { id: 0 },
      update: { name: 'EVE Universe' },
      create: { id: 0, name: 'EVE Universe' }
    })
    await prisma.eveGroup.upsert({
      where: { id: 0 },
      update: { name: 'Generic Category', categoryId: 0 },
      create: { id: 0, name: 'Generic Category', categoryId: 0 }
    })

    // 4. Inserir em massa no banco usando transação para performance
    const upserts = nameData.map(item => {
      // Filtros básicos: só processar ítens do inventário (inventory_type)
      if (item.category !== 'inventory_type') return null
      
      return prisma.eveType.upsert({
        where: { id: item.id },
        update: { name: item.name },
        create: {
          id: item.id,
          name: item.name,
          groupId: 0, // Placeholder
          published: true
        }
      })
    }).filter(Boolean)

    await Promise.all(upserts)

    return NextResponse.json({ 
      status: 'Success', 
      page: page,
      syncedCount: nameData.length,
      nextPage: page + 1,
      message: `Página ${page} (1000 itens) sincronizada! Acesse /api/debug/sync-all?page=${page + 1} para continuar.`
    })
  } catch (error: any) {
    return NextResponse.json({ status: 'Error', error: error.message }, { status: 500 })
  }
}
