const { PrismaClient } = require('@prisma/client')
const axios = require('axios')

const prisma = new PrismaClient()
const ESI_BASE = 'https://esi.evetech.net/latest'

// Categorias de Interesse
const CATEGORIES = {
  ASTEROID: 25, // Minérios, Lua, Gelo
  CELESTIAL: 2, // Gás (Harvestable Clouds)
  MATERIAL: 4   // Minerais
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getCategoryGroups(categoryId) {
  try {
    const res = await axios.get(`${ESI_BASE}/universe/categories/${categoryId}/`)
    return res.data.groups || []
  } catch (e) {
    console.error(`Erro ao buscar grupos da categoria ${categoryId}`)
    return []
  }
}

async function getGroupTypes(groupId) {
  try {
    const res = await axios.get(`${ESI_BASE}/universe/groups/${groupId}/`)
    return res.data.types || []
  } catch (e) {
    console.error(`Erro ao buscar tipos do grupo ${groupId}`)
    return []
  }
}

async function getTypeDetails(typeId) {
  try {
    const res = await axios.get(`${ESI_BASE}/universe/types/${typeId}/`)
    return res.data
  } catch (e) {
    return null
  }
}

async function syncCategory(categoryId, label) {
  console.log(`\n📦 Iniciando sincronização: ${label} (ID: ${categoryId})`)
  
  const groups = await getCategoryGroups(categoryId)
  console.log(`   Encontrados ${groups.length} grupos.`)

  let processed = 0
  let updated = 0
  
  for (const groupId of groups) {
    try {
      const groupNameRes = await axios.get(`${ESI_BASE}/universe/groups/${groupId}/`).catch(() => ({ data: { name: 'Unknown' } }))
      const groupName = groupNameRes.data.name
      
      // Upsert do grupo
      await prisma.eveGroup.upsert({
        where: { id: groupId },
        update: { name: groupName, categoryId },
        create: { id: groupId, name: groupName, categoryId }
      })

      const types = await getGroupTypes(groupId)
      console.log(`   - Grupo ${groupName} (${groupId}): ${types.length} tipos.`)

      for (const typeId of types) {
        const details = await getTypeDetails(typeId)
        if (details) {
          await prisma.eveType.upsert({
            where: { id: typeId },
            update: {
              name: details.name,
              volume: details.volume,
              groupId: details.group_id,
              basePrice: details.base_price || 0,
              published: details.published
            },
            create: {
              id: typeId,
              name: details.name,
              volume: details.volume,
              groupId: details.group_id,
              basePrice: details.base_price || 0,
              published: details.published
            }
          })
          updated++
        }
        processed++
        
        if (processed % 20 === 0) await sleep(100)
      }
    } catch (err) {
      console.error(`Erro no grupo ${groupId}:`, err.message)
    }
  }
  
  console.log(`   ✓ ${label} Concluído: ${updated} itens atualizados/criados.`)
}

async function main() {
  const startTime = Date.now()
  console.log('🚀 [SDE SYNC JS] Iniciando atualização de volumes de mineração...')

  try {
    await syncCategory(CATEGORIES.ASTEROID, 'Minérios/Asteroides')
    await syncCategory(CATEGORIES.CELESTIAL, 'Gases/Nebulas')
    await syncCategory(CATEGORIES.MATERIAL, 'Minerais')

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`\n✅ [SDE SYNC JS] Sucesso! Sincronização concluída em ${duration}s.`)
  } catch (error) {
    console.error('\n❌ [SDE SYNC JS] Erro fatal durante a sincronização:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
