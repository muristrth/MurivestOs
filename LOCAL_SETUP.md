# Murivest OS - Local Development Setup

## Prerequisites

- Node.js 24.x
- pnpm 9.x
- Supabase account (https://supabase.com)

## Database Setup (Supabase)

1. Create a new Supabase project at https://supabase.com
2. Go to Settings → Database to find your connection credentials
3. Copy `.env.example` to `.env` and update the DATABASE_URL:

   ```
   # Direct connection (port 5432)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

   # Or using connection pooler (port 6543) - recommended for serverless
   DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres
   ```

4. Push the database schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

## Running Locally

Start the API server:

```bash
pnpm --filter @workspace/api-server run dev
```

The API will be available at http://localhost:8080

## Building

Build all packages:

```bash
pnpm run build
```

## Currency Configuration

All currency values are in KES (Kenyan Shilling).
