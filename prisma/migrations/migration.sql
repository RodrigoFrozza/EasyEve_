-- Multi-character account system migration
-- Run this SQL on your PostgreSQL database

-- 1. Add accountCode to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountCode" TEXT UNIQUE;

-- 2. Add isMain to Character table
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "isMain" BOOLEAN NOT NULL DEFAULT false;

-- 3. Set isMain=true for existing characters (they are all "main" for their respective users)
UPDATE "Character" SET "isMain" = true;

-- 4. Generate accountCode for existing users
UPDATE "User" SET "accountCode" = 'EVE-' || UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 6));
