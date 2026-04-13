# Murivest OS - What Is Still Missing

This document lists features/modules that are designed but not yet fully implemented, or that require additional work for production readiness.

---

## Phase 1: Already Addressed (Revised Schema)

✅ SQL schema with proper timestamps (`timestamptz`)
✅ Foreign key relationships
✅ Audit logging table (`murivest_audit_logs`)
✅ Approval table (`murivest_approvals`)
✅ Data room access controls
✅ All core modules (CRM, properties, deals, tasks, etc.)

---

## Phase 2: Code Integration Needed

### 2.1 murivest.ts Updates

- [ ] Import new Drizzle schema tables
- [ ] Update `getUserContext()` to read DB role override
- [ ] Add `is_approved` check in `requireAuth`
- [ ] Add admin approval endpoints
- [ ] Add approval state to user upsert

### 2.2 Client Updates

- [ ] Add "Approve User" admin UI
- [ ] Show pending approvals list
- [ ] Display user approval status

---

## Phase 3: Missing Modules (Future Phases)

### 3.1 Investor Portal

| Feature                   | Status      | Notes                    |
| ------------------------- | ----------- | ------------------------ |
| Portal auth layer         | Designed    | Role-based               |
| Property listings view    | Needs build | Filtered by visibility   |
| Investor data room access | Needs build | Per-investor permissions |
| Deal status tracking      | Partial     | In deals table           |
| Document download         | Needs build | Signed URL integration   |

### 3.2 Landlord Portal

| Feature             | Status      | Notes              |
| ------------------- | ----------- | ------------------ |
| Landlord view       | Designed    | Role-based         |
| Property management | Needs build | See own properties |
| Mandate status      | Needs build | Track mandates     |
| Inquiry form        | Needs build | Contact routing    |

### 3.3 Tenant Portal

| Feature              | Status      | Notes             |
| -------------------- | ----------- | ----------------- |
| Tenant view          | Designed    | Role-based        |
| Lease viewing        | Needs build | From leases table |
| Payment tracking     | Needs build | Link to invoices  |
| Maintenance requests | Needs build | New table needed  |
| Communication        | Needs build | Messaging         |

### 3.4 Finance Module

| Feature                     | Status          | Notes                |
| --------------------------- | --------------- | -------------------- |
| Bank account reconciliation | Partial         | Tables exist         |
| Journal entries             | Partial         | Table exists         |
| Tax calculation             | Not implemented | Future phase         |
| Financial reports           | Not implemented | BI layer             |
| Payment processing          | Not implemented | Provider integration |

### 3.5 Legal Module

| Feature                 | Status          | Notes                     |
| ----------------------- | --------------- | ------------------------- |
| Court case tracking     | Partial         | litigation in matter_type |
| Settlement tracking     | Partial         | settlement in matter_type |
| External counsel portal | Not implemented | Future phase              |
| Document templates      | Not implemented | Legal document gen        |
| E-signature integration | Not implemented | Provider needed           |

### 3.6 Marketing Module

| Feature                  | Status          | Notes           |
| ------------------------ | --------------- | --------------- |
| Campaign execution       | Partial         | Tables exist    |
| Email automation         | Not implemented | Provider needed |
| Social media integration | Not implemented | API integration |
| Lead attribution         | Partial         | source field    |
| Analytics/reporting      | Not implemented | BI layer        |

### 3.7 IT/Product Module

| Feature               | Status          | Notes        |
| --------------------- | --------------- | ------------ |
| Sprint management     | Partial         | Table exists |
| Bug tracking          | Partial         | Table exists |
| Feature requests      | Partial         | Table exists |
| Release notes         | Partial         | Table exists |
| Roadmap visualization | Not implemented | UI needed    |

### 3.8 Reporting/BI

| Feature             | Status          | Notes                 |
| ------------------- | --------------- | --------------------- |
| Executive dashboard | Partial         | Command center exists |
| Pipeline analytics  | Not implemented | Deal stages           |
| Revenue forecasting | Not implemented | Future phase          |
| KPI tracking        | Not implemented | Future phase          |
| Custom reports      | Not implemented | Query builder         |

---

## Phase 4: Operational Gaps

### 4.1 Integration Gaps

- [ ] Clerk webhook not set up for user creation
- [ ] Email provider not connected
- [ ] Storage provider not connected
- [ ] KYC/AML provider not connected
- [ ] Payment provider not connected

### 4.2 Workflow Gaps

- [ ] No workflow automation engine
- [ ] No scheduled task reminders
- [ ] No SLA tracking
- [ ] No escalation rules

### 4.3 Security Gaps

- [ ] No rate limiting on API
- [ ] No MFA enforcement
- [ ] No password policy
- [ ] No session management UI
- [ ] No audit log viewer

---

## Recommended Implementation Order

```
Phase 2: Foundation (1-2 weeks)
├── Update murivest.ts with approval logic
├── Add admin approval UI
└── Enable audit logging

Phase 3: Core Portals (2-4 weeks)
├── Investor portal
├── Landlord portal
└── Tenant portal

Phase 4: Finance & Legal (2-3 weeks)
├── Invoice generation
├── Payment tracking
└── Legal matter workflow

Phase 5: Marketing & Growth (2-3 weeks)
├── Campaign automation
├── Email sequences
└── Lead scoring

Phase 6: Reporting (2-3 weeks)
├── Executive dashboard
├── Pipeline analytics
└── Custom reports
```

---

## Quick Wins

These can be implemented in days, not weeks:

1. **Enable audit logging** - Already in schema, just needs trigger setup
2. **Approval workflow** - Add to existing user table (SQL ALTER)
3. **Data room access** - Add to existing tables
4. **Pending approvals list** - Simple query endpoint
5. **Property visibility filter** - Add to existing query

---

## Questions to Answer

Before proceeding, clarify:

1. **Do you need multi-tenancy?** (currently single org)
2. **What email provider?** (Resend, SendGrid, etc.)
3. **What storage provider?** (S3, GCS, etc.)
4. **Real-time needed?** (WebSocket support)
5. **Mobile app?** (React Native / Flutter)

---

## Summary

The revised schema now covers all core modules. The gaps are primarily:

- **Code integration** (murivest.ts updates)
- **Portal UIs** (investor/landlord/tenant)
- **Integrations** (email, storage, KYC)
- **Workflow automation**

Start with Phase 2 (foundation) and build outward based on business priorities.
