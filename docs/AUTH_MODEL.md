# Murivest OS - Authentication Model Documentation

## Current Auth Flow (Clerk + App Layer)

### How Authentication Currently Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. USER LOGS IN VIA CLERK                                                   │
│    ├── Clerk handles email/password/MFA/sessions                              │
│    └── User gets Clerk session cookie                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. REQUEST TO API (middleware: @clerk/express getAuth)                        │
│    ├── express middleware extracts Clerk user ID from session                  │
│    └── req.auth = { userId, sessionClaims, ... }                          │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. murivest.ts getUserContext()                                            │
│    ├── getAuth(req) → extracts Clerk claims                              │
│    ├── publicMetadata.role → role_slug                                │
│    ├── publicMetadata.department → department_code                   │
│    └── ADMIN_EMAIL check → "super_admin" fallback                   │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. REQUIREAUTH MIDDLEWARE                                                   │
│    ├── Upserts user into murivest_users table                          │
│    ├── Stores role/department from Clerk claims                      │
│    └── req.userContext = { userId, email, role, department }      │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────���──────────────────────────────┐
│ 5. API ROUTE PERMISSION CHECKS                                              │
│    ├── requireRole(["sales", "investor_relations"])                 │
│    └── Route guards check role against allowed array               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current Implementation (murivest.ts)

```typescript
// Lines 77-106: Get user context from Clerk
function getUserContext(req) {
  const auth = getAuth(req);
  const claims = auth.sessionClaims ?? {};
  const publicMetadata = claims.publicMetadata ?? {};

  const role = String(
    publicMetadata.role ??
    metadata.role ??
    (email === ADMIN_EMAIL ? "super_admin" : "internal_team")
  );

  const department = String(
    publicMetadata.department ?? metadata.department ?? "Executive / Admin"
  );

  return { userId, email, name, role, department };
}

// Lines 108-140: Require auth middleware
const requireAuth: RequestHandler = async (req, res, next) => {
  const context = getUserContext(req);
  await db.insert(usersTable).values({
    id: `user_${context.userId}`,
    clerkUserId: context.userId,
    role: context.role,
    department: context.department,
    // ... upsert on login
  }).onConflictDoUpdate({...});
  next();
};

// Lines 142-153: Role-based route protection
function requireRole(roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (context.role === "super_admin" || roles.includes(context.role)) {
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  };
}
```

---

## Super Admin Model in Current Architecture

### How Super Admin Access Works

1. **Super Admin determination in Clerk:**
   - `murivestrealty@gmail.com` email → auto-granted "super_admin" role
   - OR set `publicMetadata.role = "super_admin"` in Clerk dashboard

2. **Super Admin privileges in murivest.ts:**

   ```typescript
   // Line 94: ADMIN_EMAIL check
   email === ADMIN_EMAIL ? "super_admin" : "internal_team";

   // Line 147: Super admin bypass
   if (context.role === "super_admin" || roles.includes(context.role)) {
     next(); // Super admin passes all role checks
   }
   ```

### Approval Workflow (NEW in Revised Schema)

The revised schema adds `is_approved` in the database for additional control:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPROVAL STATE STORED IN DATABASE                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ murivest_users:                                                        │
│   - is_approved: boolean (default: false)                            │
│   - approved_at: timestamptz                                         │
│   - approved_by_user_id: text                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ APPROVAL WORKFLOW:                                                    │
│   1. New user logs in via Clerk                                      ��
│   2. User upserted to murivest_users with is_approved = false          │
│   3. Super admin reviews user in admin panel                          │
│   4. Super admin clicks "Approve" → updates is_approved = true       │
│   5. API checks both is_approved AND role BEFORE allowing access     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Recommended Pattern for Murivest OS

### What Stays in Clerk Claims (Authentication)

| Data                | Location             | Reason                      |
| ------------------- | -------------------- | --------------------------- |
| User identity (sub) | Clerk JWT            | Required for session        |
| Email verification  | Clerk JWT            | Required for auth           |
| Basic role seed     | Clerk publicMetadata | Initial role on first login |
| Department seed     | Clerk publicMetadata | Initial dept on first login |
| MFA status          | Clerk                | Auth security               |

### What Moves to Database (Authorization)

| Data                  | Location                           | Reason                      |
| --------------------- | ---------------------------------- | --------------------------- |
| `is_approved`         | murivest_users.is_approved         | Super admin controls access |
| `approved_at`         | murivest_users.approved_at         | Audit when approved         |
| `approved_by_user_id` | murivest_users.approved_by_user_id | Track who approved          |
| Role overrides        | murivest_users.role_slug           | DB can override Clerk       |
| Department overrides  | murivest_users.department_code     | DB can override Clerk       |

### Implementation in murivest.ts

```typescript
// Enhanced checkUserApproved function
async function checkUserApproved(userId: string): Promise<boolean> {
  const [user] = await db
    .select()
    .from(murivestUsersTable)
    .where(eq(murivestUsersTable.clerkUserId, userId))
    .limit(1);

  // If no user record or not approved, deny access to sensitive data
  if (!user || !user.isApproved) {
    return false;
  }

  return true;
}

// Enhanced requireAuth middleware
const requireAuth: RequestHandler = async (req, res, next) => {
  const context = getUserContext(req);

  // Get user from DB for approval check
  const [dbUser] = await db
    .select()
    .from(murivestUsersTable)
    .where(eq(murivestUsersTable.clerkUserId, context.userId))
    .limit(1);

  // Use DB role if it exists, otherwise use Clerk claim
  const role = dbUser?.roleSlug ?? context.role;
  const department = dbUser?.departmentCode ?? context.department;

  // Upsert user, preserving approval state
  await db
    .insert(murivestUsersTable)
    .values({
      id: `user_${context.userId}`,
      clerkUserId: context.userId,
      email: context.email,
      firstName: context.name.split(" ")[0],
      lastName: context.name.split(" ").slice(1).join(" "),
      roleSlug: role,
      departmentCode: department,
      isApproved: dbUser?.isApproved ?? false, // Preserve or set false
      isActive: true,
      lastLoginAt: new Date(),
      loginCount: (dbUser?.loginCount ?? 0) + 1,
    })
    .onConflictDoUpdate({
      target: murivestUsersTable.clerkUserId,
      set: {
        roleSlug: role,
        departmentCode: department,
        lastLoginAt: new Date(),
        loginCount: (dbUser?.loginCount ?? 0) + 1,
      },
    });

  req.userContext = { ...context, role, department };
  next();
};
```

---

## API Route Protection Patterns

### Current Pattern (No Change Needed)

```typescript
// Public data - no auth required
router.get("/murivest/public/properties", async (req, res) => {
  const properties = await db.select().from(propertiesTable);
  res.json(properties.filter((p) => p.visibilityLevel === "public"));
});

// Internal data - require auth
router.get(
  "/murivest/contacts",
  requireRole(["internal_team", "sales"]),
  async (req, res) => {
    const contacts = await db.select().from(contactsTable);
    res.json(contacts);
  },
);

// Sensitive data - require approval + role
router.get(
  "/murivest/investors",
  requireRole(["investor_relations", "super_admin"]),
  async (req, res) => {
    // Optional: Add approval check
    const isApproved = await checkUserApproved(context.userId);
    if (!isApproved) {
      return res.status(403).json({ error: "Not approved" });
    }
    const investors = await db.select().from(investorsTable);
    res.json(investors);
  },
);
```

---

## Super Admin Approval API

```typescript
// Super admin only routes
router.patch(
  "/murivest/admin/users/:userId/approve",
  requireRole(["super_admin"]),
  async (req, res) => {
    const { userId } = req.params;
    const context = req.userContext;

    // Update approval state
    await db
      .update(murivestUsersTable)
      .set({
        isApproved: true,
        approvedAt: new Date(),
        approvedByUserId: context.userId,
        roleSlug: req.body.roleSlug, // Optional: set role on approval
        departmentCode: req.body.departmentCode,
      })
      .where(eq(murivestUsersTable.clerkUserId, userId));

    res.json({ success: true });
  },
);

router.get(
  "/murivest/admin/pending-approvals",
  requireRole(["super_admin"]),
  async (req, res) => {
    const pending = await db
      .select()
      .from(murivestUsersTable)
      .where(
        and(
          eq(murivestUsersTable.isApproved, false),
          eq(murivestUsersTable.isActive, true),
        ),
      );
    res.json(pending);
  },
);
```

---

## Migration Strategy

### Phase 1: Add New Columns (Non-Breaking)

```sql
-- Add approval columns to existing table
ALTER TABLE murivest_users
ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by_user_id text;

-- Update existing admin to approved
UPDATE murivest_users
SET is_approved = true, approved_at = now()
WHERE email = 'murivestrealty@gmail.com';
```

### Phase 2: Update Code (murivest.ts)

1. Import new table schema
2. Add approval check in requireAuth
3. Add admin approval endpoints

### Phase 3: Enable Approval Workflow

1. Super admin can approve users in UI
2. Users see "pending approval" state
3. Sensitive routes check approval

---

## Security Summary

| Layer            | Current       | With Revision               |
| ---------------- | ------------- | --------------------------- |
| Auth             | Clerk         | Clerk (unchanged)           |
| Role source      | Clerk claims  | Clerk → DB (DB wins)        |
| Approval         | None          | DB is_approved field        |
| Route protection | requireRole() | requireRole() + is_approved |
| Audit            | None          | approval_at + approved_by   |

The key Principle: **Clerk handles WHO can log in, DB handles WHAT they can access.**

This keeps your current authentication flow working while adding the approval control layer you need.
