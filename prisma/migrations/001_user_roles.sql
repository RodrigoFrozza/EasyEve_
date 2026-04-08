-- Migration: User Roles and Activity Permissions
-- Adiciona campos role e allowedActivities ao User

-- Adicionar colunas role e allowedActivities
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowedActivities" TEXT[] NOT NULL DEFAULT ARRAY['ratting']::TEXT[];

-- Identificar o usuário master (Rodrigo Frozza) e definir como master
UPDATE "User" 
SET role = 'master', allowedActivities = ARRAY['mining', 'ratting', 'abyssal', 'exploration', 'crab', 'escalations', 'pvp']::TEXT[]
WHERE id = (
  SELECT c."userId" 
  FROM "Character" c 
  WHERE LOWER(c.name) = 'rodrigo frozza' 
  LIMIT 1
);

-- Verificar se a atualização foi aplicada
SELECT u.id, u.role, u."accountCode", c.name as "characterName"
FROM "User" u
LEFT JOIN "Character" c ON c."userId" = u.id
WHERE u.role = 'master';