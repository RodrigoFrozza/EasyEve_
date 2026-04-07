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

*This document is the official technical reference for the RodrigoFrozza/EasyEve_ project.*
