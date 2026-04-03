-- EasyEve Database Migration - Complete Schema
-- Generated from prisma/schema.prisma

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "accountCode" TEXT,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_accountCode_key" ON "User"("accountCode");

-- Character table
CREATE TABLE IF NOT EXISTS "Character" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ownerHash" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "totalSp" INTEGER NOT NULL DEFAULT 0,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "ship" TEXT,
    "shipTypeId" INTEGER,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Character_ownerHash_key" ON "Character"("ownerHash");
CREATE INDEX IF NOT EXISTS "Character_userId_idx" ON "Character"("userId");

-- Fit table
CREATE TABLE IF NOT EXISTS "Fit" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "shipTypeId" INTEGER NOT NULL,
    "shipName" TEXT NOT NULL,
    "modules" JSONB NOT NULL DEFAULT '[]',
    "dps" INTEGER,
    "tank" INTEGER,
    "cost" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Fit_userId_idx" ON "Fit"("userId");

-- MiningSession table
CREATE TABLE IF NOT EXISTS "MiningSession" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "systemId" INTEGER,
    "systemName" TEXT,
    "oreType" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedIsk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "characterId" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MiningSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MiningSession_userId_idx" ON "MiningSession"("userId");

-- RattingSession table
CREATE TABLE IF NOT EXISTS "RattingSession" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "siteType" TEXT,
    "bounty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sitesCompleted" INTEGER NOT NULL DEFAULT 0,
    "characterId" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RattingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RattingSession_userId_idx" ON "RattingSession"("userId");

-- AbyssalSession table
CREATE TABLE IF NOT EXISTS "AbyssalSession" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "filamentType" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "loot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iskPerMinute" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "survived" BOOLEAN NOT NULL DEFAULT true,
    "characterId" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbyssalSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AbyssalSession_userId_idx" ON "AbyssalSession"("userId");

-- ExplorationSignature table
CREATE TABLE IF NOT EXISTS "ExplorationSignature" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "systemId" INTEGER,
    "systemName" TEXT,
    "notes" TEXT,
    "characterId" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExplorationSignature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExplorationSignature_userId_idx" ON "ExplorationSignature"("userId");

-- FleetSession table
CREATE TABLE IF NOT EXISTS "FleetSession" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "fleetType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "iskPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "characterId" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FleetSession_userId_idx" ON "FleetSession"("userId");

-- SDE Cache table
CREATE TABLE IF NOT EXISTS "SdeCache" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SdeCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SdeCache_key_key" ON "SdeCache"("key");
CREATE INDEX IF NOT EXISTS "SdeCache_expiresAt_idx" ON "SdeCache"("expiresAt");

-- Filament Types table
CREATE TABLE IF NOT EXISTS "filament_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weather" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "effect" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filament_types_pkey" PRIMARY KEY ("id")
);

-- Ore Types table
CREATE TABLE IF NOT EXISTS "ore_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "volume" DOUBLE PRECISION,
    "basePrice" DOUBLE PRECISION,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ore_types_pkey" PRIMARY KEY ("id")
);

-- Exploration Site Types table
CREATE TABLE IF NOT EXISTS "exploration_site_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exploration_site_types_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Character_userId_fkey'
    ) THEN
        ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Fit_userId_fkey'
    ) THEN
        ALTER TABLE "Fit" ADD CONSTRAINT "Fit_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MiningSession_userId_fkey'
    ) THEN
        ALTER TABLE "MiningSession" ADD CONSTRAINT "MiningSession_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'RattingSession_userId_fkey'
    ) THEN
        ALTER TABLE "RattingSession" ADD CONSTRAINT "RattingSession_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'AbyssalSession_userId_fkey'
    ) THEN
        ALTER TABLE "AbyssalSession" ADD CONSTRAINT "AbyssalSession_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ExplorationSignature_userId_fkey'
    ) THEN
        ALTER TABLE "ExplorationSignature" ADD CONSTRAINT "ExplorationSignature_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FleetSession_userId_fkey'
    ) THEN
        ALTER TABLE "FleetSession" ADD CONSTRAINT "FleetSession_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
    END IF;
END $$;
