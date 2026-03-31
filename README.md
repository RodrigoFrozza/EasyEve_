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

7. Start the development server:
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
