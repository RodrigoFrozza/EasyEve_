import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ESI_BASE_URL = 'https://esi.evetech.net/latest'

// Categorias essenciais para Ratting e Loot
const SYNC_CONFIG = [
  { id: 17, name: 'Trade Goods/Tags' },
  { id: 34, name: 'Ancient Relics/Data Loot' },
  { id: 8,  name: 'Ammo' }
]

async function fetchESI(path: string) {
  const res = await fetch(`${ESI_BASE_URL}${path}`)
  if (!res.ok) return null
  return res.json()
}

async function main() {
  console.log('🚀 Iniciando Quick Sync de Itens (Ratting focus)...')
  
  for (const category of SYNC_CONFIG) {
    console.log(`\n📦 Processando: ${category.name} (Cat ${category.id})`)
    
    // Upsert Category
    await prisma.eveCategory.upsert({
      where: { id: category.id },
      update: { name: category.name },
      create: { id: category.id, name: category.name }
    })

    const groupIds: number[] = await fetchESI(`/universe/categories/${category.id}/`).then(d => d?.groups || [])
    
    for (const groupId of groupIds) {
      const typeIds: number[] = await fetchESI(`/universe/groups/${groupId}/`).then(d => d?.types || [])
      
      await prisma.eveGroup.upsert({
        where: { id: groupId },
        update: { name: `Group ${groupId}`, categoryId: category.id },
        create: { id: groupId, name: `Group ${groupId}`, categoryId: category.id }
      })

      console.log(`  > Grupo ${groupId}: ${typeIds.length} itens encontrados.`)

      for (const typeId of typeIds) {
        try {
          const details: any = await fetchESI(`/universe/types/${typeId}/`)
          if (!details || !details.published) continue

          await prisma.eveType.upsert({
            where: { id: typeId },
            update: {
              name: details.name,
              description: details.description || '',
              groupId: groupId,
              volume: details.volume || 0,
              published: details.published
            },
            create: {
              id: typeId,
              name: details.name,
              description: details.description || '',
              groupId: groupId,
              volume: details.volume || 0,
              published: details.published
            }
          })
        } catch (err) {
          // Ignorar erros individuais
        }
      }
    }
  }

  console.log('\n✨ Quick Sync Concluído! O Appraisal deve funcionar agora.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
