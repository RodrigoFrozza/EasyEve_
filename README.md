# EasyEve - EVE Online Personal ERP

Your personal EVE Online management system for tracking characters, fleets, mining, PVE activities, and more.

## Features

- **Multi-Character Management**: Link all your EVE Online characters to a single account
- **Dashboard**: Overview of all your characters with stats
- **Fleet Calculator**: Calculate fleet profits and earnings distribution
- **Mining Tracker**: Track mining sessions and earnings
- **Ratting Tracker**: Monitor PVE ratting activities and bounties
- **Abyssal Tracker**: Log abyssal space runs and loot
- **Exploration Tracker**: Track exploration sites and findings
- **Fit Manager**: Create and manage ship fits

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (Dark theme)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js with EVE Online OAuth2 (ESI)
- **Static Data**: EVE Online SDE (Static Data Export)

## Data Sources

EasyEve uses real-time data from trusted EVE Online sources:

| Source | URL | Purpose |
|--------|-----|---------|
| **ESI (EVE Swagger Interface)** | https://esi.evetech.net | Character data, wallet, skills, assets |
| **EVE Images** | https://images.evetech.net | Character portraits, ship renders, logos |
| **Fuzzwork SDE** | https://www.fuzzwork.co.uk/dump | Static data (types, systems, groups) |
| **Adam4EVE** | https://static.adam4eve.eu | Daily ID updates, market data |

### Data Policy: No Hardcoded Data

**Principle:** All game data (type names, system names, module info, etc.) must be fetched from official sources, never hardcoded.

- ✅ Type names from SDE/ESI
- ✅ System names from SDE/ESI
- ✅ Ship/module info from SDE
- ✅ Market groups from SDE
- ❌ Hardcoded values are bugs to be fixed

## Roadmap: SDE Integration

### Goal
Eliminate ALL hardcoded data from the codebase, always fetching real information from APIs or databases.

### Data Sources Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      EasyEve Data Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Fuzzwork   │    │  Adam4EVE    │    │     ESI      │ │
│  │    SDE      │    │     IDs      │    │   (Live)     │ │
│  │ (PostgreSQL) │    │   (Daily)    │    │ (Real-time)  │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│         │                   │                     │          │
│         └───────────────────┴─────────────────────┘          │
│                             │                                  │
│                    ┌─────────▼─────────┐                      │
│                    │   SDE Cache DB    │                      │
│                    │   (PostgreSQL)    │                      │
│                    └─────────┬─────────┘                      │
│                              │                                  │
│                    ┌─────────▼─────────┐                      │
│                    │   Next.js API     │                      │
│                    │    Routes         │                      │
│                    └─────────┬─────────┘                      │
│                              │                                  │
│                    ┌─────────▼─────────┐                      │
│                    │     Frontend       │                      │
│                    │   (Dashboard)      │                      │
│                    └────────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: SDE Database Setup
- [x] Create Prisma models for SDE data
- [ ] Import Fuzzwork SDE to PostgreSQL
- [ ] Create SDE cache table in PostgreSQL
- [ ] Create `src/lib/sde/` module

#### Phase 2: API Endpoints
- [ ] `GET /api/sde/types` - Search types by name
- [ ] `GET /api/sde/types/[id]` - Get type details
- [ ] `GET /api/sde/systems` - Search solar systems
- [ ] `GET /api/sde/groups` - Get item groups
- [ ] `GET /api/sde/filaments` - Get abyssal filaments
- [ ] `POST /api/sde/sync` - Trigger SDE sync

#### Phase 3: Replace Hardcoded Data
- [ ] **Abyssal Page**: Fix `filamentTypes` (currently WRONG)
- [ ] **Ratting Page**: Remove hardcoded `siteTypes`
- [ ] **Mining Page**: Remove hardcoded `oreTypes`
- [ ] **Fits Page**: Remove hardcoded ship groups
- [ ] **Exploration Page**: Remove hardcoded site types

#### Phase 4: Sync & Maintenance
- [ ] Create sync script for Fuzzwork SDE updates
- [ ] Configure Coolify scheduled task for daily Adam4EVE sync
- [ ] Document update procedures

### SDE Tables

| Table | Description | Source |
|-------|-------------|--------|
| `invTypes` | All item types (ships, modules, etc.) | Fuzzwork SDE |
| `invGroups` | Item group definitions | Fuzzwork SDE |
| `invCategories` | Top-level categories | Fuzzwork SDE |
| `invMarketGroups` | Market navigation | Fuzzwork SDE |
| `mapSolarSystems` | Solar system info | Fuzzwork SDE |
| `mapRegions` | Region names | Fuzzwork SDE |
| `mapConstellations` | Constellation names | Fuzzwork SDE |
| `dgmTypeAttributes` | Item attributes (CPU, capacitor, etc.) | Fuzzwork SDE |
| `sdeCache` | Application-level cache | Generated |

### API Endpoints

```
/api/sde/
├── types              GET  - List/search types
│   └── [id]          GET  - Get type details
├── systems           GET  - List/search systems
│   └── [id]          GET  - Get system details
├── groups            GET  - List groups
├── categories        GET  - List categories
├── filaments         GET  - Get abyssal filament types
├── regions           GET  - List regions
└── sync              POST - Trigger SDE sync
```

### Cache Strategy

| Data Type | TTL | Refresh |
|-----------|-----|---------|
| Type names | 7 days | Daily |
| System names | 24 hours | Daily |
| Group names | 30 days | Weekly |
| Character data | 1 hour | On-demand |
| Market data | 5 minutes | On-demand |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- EVE Online Developer Account (for ESI API access)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Update the environment variables with your EVE Online API credentials

5. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

6. Push the database schema:
   ```bash
   npm run db:push
   ```

7. Import the SDE (recommended):
   ```bash
   # Download from Fuzzwork
   wget https://www.fuzzwork.co.uk/dump/postgres-latest.dmp.bz2
   bunzip2 postgres-latest.dmp.bz2
   
   # Import (creates SDE tables)
   psql $DATABASE_URL < postgres-latest.dmp
   ```

8. Start the development server:
   ```bash
   npm run dev
   ```

### Build for Production

```bash
npm run build
npm start
```

## EVE Online ESI Setup

1. Go to [EVE Online Developers](https://developers.eveonline.com)
2. Create a new application
3. Set the callback URL to: `http://localhost:3000/api/auth/callback/eveonline`
4. Copy the Client ID and Client Secret to your `.env` file

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EVE_CLIENT_ID` | EVE Online OAuth Client ID |
| `EVE_CLIENT_SECRET` | EVE Online OAuth Client Secret |
| `NEXTAUTH_SECRET` | Secret for JWT token encryption |
| `NEXTAUTH_URL` | Application URL (for production) |
| `DATABASE_URL` | PostgreSQL connection string |

## License

MIT License - See LICENSE file for details

## Disclaimer

EVE Online is a registered trademark of CCP Games. EasyEve is not affiliated with CCP Games.
