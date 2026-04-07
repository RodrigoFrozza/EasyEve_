# 🚀 EasyEve_ Technical Documentation

This document provides a deep technical dive into the **EasyEve_** codebase, architecture, and operational logic.

---

## 🛠️ 1. Technologies & Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router).
- **Backend/ORM**: [Prisma ORM](https://www.prisma.io/).
- **Database**: [Postgres](https://www.postgresql.org/) hosting Character, Fits, and EVE Unified SDE data.
- **State**: [Zustand](https://github.com/pmndrs/zustand) for global client-side activity state.
- **Auth**: [NextAuth.js](https://next-auth.js.org/) (EVE Online SSO).

---

## 🏗️ 2. Project Folder Structure

```text
EasyEve/
├── prisma/               # Database schema and migrations
├── public/               # Static assets (icons, images)
├── scripts/              # SDE synchronization and maintenance scripts
└── src/
    ├── app/              # Next.js App Router (Pages & API Routes)
    │   ├── api/          # Backend API architecture
    │   └── dashboard/    # Main user interface (Activity Tracker, etc.)
    ├── components/       # Reusable React UI components (Shadcn/UI)
    │   ├── ui/           # Low-level UI primitives
    │   └── layout/       # Sidebar, Topbar, etc.
    └── lib/              # Core business logic and shared utilities
        ├── esi/          # ESI API integration (Wallet, Location, etc.)
        ├── sde/          # SDE lookup logic and regional helpers
        ├── stores/       # Zustand store definitions (Activity Store)
        └── prisma.ts     # Global Prisma Client instance
```

---

## 🔄 3. Data Flow & Patterns

### 📡 3.1. SDE Integration Pattern
Static EVE data is queried from the local Postgres instance rather than ESI, significantly improving performance.
- **Client-Side**: Components call `/api/sde/anomalies` to get filtered site lists based on faction context.
- **Server-Side**: The API route queries the `EveType` table using Prisma, applying localized filters (Hub, Haven, etc.).

### 💰 3.2. Automated Profit Tracking (The ESI Sync)
Tracking real character earnings involves a secure, multi-step flow:
1.  **Trigger**: User clicks "Sync ESI" in the `ActivityCard`.
2.  **Auth**: `fetchWithAuth` in `src/lib/esi.ts` retrieves a valid EVE SSO access token.
3.  **Fetch**: Queries `GET /characters/{id}/wallet/journal/`.
4.  **Process**: Filters entries (`bounty_payout`, `ess_payout`) based on the activity's `startTime`.
5.  **Persistence**: Updates the `Activity` record in Prisma with `automatedBounties` and `automatedEss` fields.
6.  **UI Update**: The Zustand store is refreshed, updating the dashboard's "Est. Value" cards.

### 🛡️ 3.3. Multi-Participant Logic
Each activity tracks a dynamic `participants` JSON field:
- **Structure**: `[{ "characterId": number, "fit": string }]`
- **Impact**: Enables future fleet analytics, such as totaling DPS/Tank based on the linked Fits.

---

## 🌐 4. Existing API Endpoints Reference

| Category | Endpoint | Method | Key Logic |
| :--- | :--- | :--- | :--- |
| **Activities** | `/api/activities` | `GET/POST` | Manages active/completed sessions. |
| **Profit Sync** | `/api/activities/sync` | `POST` | Processes ESI Wallet Journals. |
| **SDE Lookup** | `/api/sde/anomalies` | `GET` | Contextually filters `EveType` entries. |
| **Auth** | `/api/auth/[...nextauth]`| `ANY` | EVE SSO v2 JWT handling. |

---

## ☁️ 5. Infrastructure & Production (Hostinger/Coolify)

- **Platform**: **Hostinger KVM 1 VPS** (Ubuntu Linux).
- **Control Plane**: **Coolify** (Docker Orchestration).
- **Environment Management**: Environment variables (secrets) are injected via the Coolify dashboard into the Docker containers.

---

## 🧪 6. Key Development Rules

1.  **SDE First**: Always check the local `EveType` table before calling ESI for item data.
2.  **Zustand for Active State**: Use the `useActivityStore` for real-time tracking to minimize database load.
3.  **Type Safety**: Keep the `prisma generate` command active in the build pipeline (`package.json`) to keep the Client in sync with the Cloud DB.

---

## 🛰️ 7. Detailed Activity Workflows

This section breaks down how specific game activities are handled within the tracker.

### 7.1. Activity: Ratting (Combat Anomalies)
The Ratting module is designed to track fleet earnings from NPC bounties and ESS payouts with minimal manual input.

#### A. Configuration & Setup
- **Contextual SDE Selection**: When a user selects an **NPC Faction** (e.g., Angel Cartel) and **Site Type** (Combat Anomaly), the system triggers a background fetch to `/api/sde/anomalies`.
- **Filtering Logic**: The API queries the `EveType` table for site names containing keywords like *Hub, Haven, Sanctum, Horde* linked to that faction.
- **Dynamic Fallback**: If the SDE query returns no results, the UI falls back to a pre-defined static list (`ANOMALIES_BY_FACTION`) to ensure the user is never blocked.

#### B. Fleet Management
- **Participants**: Supports multiple pilots in a single session.
- **Fit Association**: Each participant can be assigned a specific `Fit` ID. This allows the system to later calculate the "Value at Risk" or total Fleet DPS/Tank based on those loadouts.
- **MTU Management**: Users can manage MTUs directly from the active activity card. MTU contents (`mtuContents`) are stored as JSON within the activity record.

#### C. Financial Logic (The "Profit Engine")
The core value of the Ratting module is its **Automated Profit Tracking**:
1.  **Sync Trigger**: The "Sync ESI" button initiates a POST to `/api/activities/sync`.
2.  **Wallet Polling**: The server iterates through all activity participants, fetching their `wallet/journal` via ESI.
3.  **Time-Boxing**: Only journal entries with a timestamp *after* the activity's `startTime` are considered.
4.  **Transaction Filters**:
    - `bounty_payout`: Standard NPC kills (typically net amount).
    - `ess_payout`: Payouts from the Encounter Surveillance System.
    - `corporation_tax_payout`: Automatically detected and added back to calculate **Gross Earnings**.
5.  **Calculations**:
    - **Gross ISK**: Sum of automated bounties + automated taxes + automated ESS.
    - **Net ISK**: Total liquid income deposited into character wallets.
    - **ISK/hr**: `(Total Net ISK / Elapsed Time in Hours)`.

---

*This document is the official technical reference for the RodrigoFrozza/EasyEve_ project.*
