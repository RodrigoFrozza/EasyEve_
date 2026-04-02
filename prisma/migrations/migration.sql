-- SDE tables for EasyEve

-- SDE Cache table
CREATE TABLE IF NOT EXISTS "SdeCache" (
    "id" TEXT NOT NULL DEFAULT cuuid(),
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
