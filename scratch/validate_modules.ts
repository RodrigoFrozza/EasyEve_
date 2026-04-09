
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- VALIDANDO SISTEMA DE MÓDULOS ---')
  
  // 1. Buscar um usuário existente
  const user = await prisma.user.findFirst()
  
  if (!user) {
    console.error('Nenhum usuário encontrado no banco de dados para teste.')
    return
  }
  
  console.log(`Usuário selecionado: ${user.name} (ID: ${user.id})`)
  console.log(`Módulos atuais: [${user.allowedActivities.join(', ')}]`)
  
  const originalActivities = [...user.allowedActivities]
  const testModule = 'mining' // Módulo para teste
  
  // 2. Simular ativação/desativação
  let nextActivities: string[]
  if (originalActivities.includes(testModule)) {
    console.log(`Removendo módulo de teste: ${testModule}`)
    nextActivities = originalActivities.filter(a => a !== testModule)
  } else {
    console.log(`Adicionando módulo de teste: ${testModule}`)
    nextActivities = [...originalActivities, testModule]
  }
  
  // 3. Persistir no banco de dados (mesma lógica do PUT admin/accounts)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { allowedActivities: nextActivities }
  })
  
  console.log(`Novos módulos no BD: [${updatedUser.allowedActivities.join(', ')}]`)
  
  // 4. Verificação
  const success = updatedUser.allowedActivities.includes(testModule) !== originalActivities.includes(testModule)
  
  if (success) {
    console.log('✅ SUCESSO: O banco de dados foi atualizado corretamente.')
  } else {
    console.error('❌ ERRO: O banco de dados NÃO refletiu a mudança.')
  }
  
  // 5. Restaurar estado original
  console.log('Restaurando estado original...')
  await prisma.user.update({
    where: { id: user.id },
    data: { allowedActivities: originalActivities }
  })
  console.log('Estado original restaurado.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
