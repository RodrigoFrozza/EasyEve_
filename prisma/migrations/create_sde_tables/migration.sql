-- Create ShipStats table
CREATE TABLE IF NOT EXISTS "ShipStats" (
    "typeId" INTEGER NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "highSlots" INTEGER DEFAULT 0,
    "medSlots" INTEGER DEFAULT 0,
    "lowSlots" INTEGER DEFAULT 0,
    "rigSlots" INTEGER DEFAULT 0,
    "cpu" REAL DEFAULT 0,
    "powerGrid" REAL DEFAULT 0,
    "capacitor" REAL DEFAULT 0,
    "shieldCapacity" REAL DEFAULT 0,
    "armorHP" REAL DEFAULT 0,
    "hullHP" REAL DEFAULT 0,
    "maxVelocity" REAL DEFAULT 0,
    "agility" REAL DEFAULT 0,
    "warpSpeed" REAL DEFAULT 0,
    "droneBay" REAL DEFAULT 0,
    "cargo" REAL DEFAULT 0,
    "syncedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create ModuleStats table
CREATE TABLE IF NOT EXISTS "ModuleStats" (
    "typeId" INTEGER NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "groupId" INTEGER,
    "groupName" TEXT,
    "cpu" REAL DEFAULT 0,
    "powerGrid" REAL DEFAULT 0,
    "slotType" TEXT,
    "effects" JSONB DEFAULT '{}',
    "syncedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ModuleStats_slotType_idx" ON "ModuleStats"("slotType");
CREATE INDEX IF NOT EXISTS "ModuleStats_groupId_idx" ON "ModuleStats"("groupId");