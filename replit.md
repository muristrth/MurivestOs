# Murivest OS

## Overview

Murivest OS is a comprehensive real estate operating system built with:

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Authentication**: Clerk with server-side route enforcement
- **Object storage**: Google Cloud Storage (configure in .env)
- **Currency**: KES (Kenyan Shilling)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Setup

1. Install PostgreSQL 16+
2. Create database: `createdb murivest_os`
3. Copy `.env.example` to `.env` and set DATABASE_URL
4. Push schema: `pnpm --filter @workspace/db run push`

## Murivest OS Features

The platform implements an enterprise operating system for Murivest Realty:

- Public landing page plus authenticated admin workspace
- Role-based access control (Admin, Sales, Investor Relations, Marketing, Finance, Legal, HR, Operations, IT)
- Executive command center with pipeline value, weighted AUM, mandate pressure, legal exposure, approval pressure
- Full CRM, property, deal, task, document, finance, legal matter management
- Separate Investor, Landlord and Tenant portal screens with role checks
- Accounting system with statements, taxes, revenue, costs, cash accounts
- Marketing system with campaigns, social media, content calendar
- HR / Murivest Academy with training and employee success courses
- Document vault with file storage
- Legal & Compliance with KYC tracking
- Meeting and KPI tracking
- Approval workflows for ATS, mandates, investor onboarding
- All amounts in KES (Kenyan Shilling)

Database schema in `lib/db/src/schema/murivest.ts` includes tables for:

- users, contacts, properties, deals, tasks, documents, finance records
- legal matters, operating records, notifications, activity
- approvals, mandates, investors, campaigns, meetings, training
