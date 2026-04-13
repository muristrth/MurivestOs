import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  activityTable,
  appRolesTable,
  companiesTable,
  contactsTable,
  dealsTable,
  departmentsTable,
  documentsTable,
  financeRecordsTable,
  insertContactSchema,
  insertDealSchema,
  insertDocumentSchema,
  insertFinanceRecordSchema,
  insertLegalMatterSchema,
  insertOperatingRecordSchema,
  insertPropertySchema,
  insertTaskSchema,
  legalMattersTable,
  notificationsTable,
  operatingRecordsTable,
  propertiesTable,
  tasksTable,
  usersTable,
  db,
} from "@murivest/db";

const router: IRouter = Router();
const ADMIN_EMAIL = "murivestrealty@gmail.com";
const CURRENCY_SYMBOL = "Ksh";
const CURRENCY_CODE = "KES";
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const moduleEnum = z.enum([
  "daily-log",
  "traffic-log",
  "flagship-tasks",
  "capital-partners",
  "mandates",
  "accounting",
  "marketing",
  "hr-academy",
  "it-product",
  "capital-suite",
  "meetings-kpis",
  "legal-billing",
  "disputes-litigation",
  "lease-workflows",
  "playbooks",
]);

const ContactBody = insertContactSchema
  .omit({ id: true, lastInteraction: true, lastInteractionAt: true })
  .extend({
    firstName: z.string().min(1),
    category: z.string().min(1),
    contactType: z.string().min(1),
  });
const PropertyBody = insertPropertySchema
  .omit({ id: true, mandateHealth: true })
  .extend({
    title: z.string().min(1),
    propertyType: z.string().min(1),
    country: z.string().min(1),
    city: z.string().min(1),
  });
const DealBody = insertDealSchema.omit({ id: true, probability: true }).extend({
  title: z.string().min(1),
  stage: z.string().min(1),
});
const TaskBody = insertTaskSchema.omit({ id: true }).extend({
  title: z.string().min(1),
  taskType: z.string().min(1),
  priority: z.string().min(1),
  status: z.string().min(1),
});
const DocumentBody = insertDocumentSchema
  .omit({ id: true, uploadedAt: true })
  .extend({
    title: z.string().min(1),
  });
const FinanceBody = insertFinanceRecordSchema.omit({ id: true }).extend({
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.number(),
  status: z.string().min(1),
});
const LegalMatterBody = insertLegalMatterSchema.omit({ id: true }).extend({
  title: z.string().min(1),
  matterType: z.string().min(1),
  status: z.string().min(1),
  priority: z.string().min(1),
});
const OperatingBody = insertOperatingRecordSchema.omit({ id: true }).extend({
  module: moduleEnum,
  title: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  date: z.string().min(1),
  details: z.string().min(1),
});
const NotificationBody = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
  module: z.string().min(1),
  recipient: z.string().email().default(ADMIN_EMAIL),
});

async function getUserContext(req: Parameters<RequestHandler>[0]) {
  const auth = getAuth(req);
  const claims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
  const publicMetadata = (claims.publicMetadata ?? {}) as Record<
    string,
    unknown
  >;
  const metadata = (claims.metadata ?? {}) as Record<string, unknown>;
  const email = String(
    claims.email ??
      claims.primary_email_address ??
      claims.email_address ??
      "authenticated-user@murivest.local",
  ).toLowerCase();

  // Check DB for role override first
  let dbRole: string | null = null;
  let dbIsApproved = false;
  let dbIsActive = true;
  let dbCanLogin = true;

  if (auth.userId) {
    const [dbUser] = await db
      .select({
        roleSlug: usersTable.roleSlug,
        isApproved: usersTable.isApproved,
        isActive: usersTable.isActive,
        canLogin: usersTable.canLogin,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, auth.userId))
      .limit(1);

    if (dbUser) {
      dbRole = dbUser.roleSlug;
      dbIsApproved = dbUser.isApproved;
      dbIsActive = dbUser.isActive;
      dbCanLogin = dbUser.canLogin;
    }
  }

  const role =
    dbRole ??
    String(
      publicMetadata.role ??
        metadata.role ??
        (email === ADMIN_EMAIL ? "super_admin" : "internal_team"),
    );
  const department = String(
    publicMetadata.department ?? metadata.department ?? "Executive / Admin",
  );
  return {
    userId: auth.userId,
    email,
    name: String(claims.name ?? email),
    role,
    department,
    isApproved: dbIsApproved,
    isActive: dbIsActive,
    canLogin: dbCanLogin,
  };
}

const requireAuth: RequestHandler = async (req, res, next) => {
  const context = await getUserContext(req);
  if (!context.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Upsert user (create or update)
  await db
    .insert(usersTable)
    .values({
      id: `user_${context.userId}`,
      clerkUserId: context.userId,
      email: context.email,
      firstName: context.name.split(" ")[0],
      lastName: context.name.split(" ").slice(1).join(" "),
      fullName: context.name,
      roleSlug: context.role,
      isApproved: context.isApproved,
      canLogin: context.canLogin,
      isActive: context.isActive,
      userType: "internal",
      lastLoginAt: new Date(),
    })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: {
        email: context.email,
        firstName: context.name.split(" ")[0],
        lastName: context.name.split(" ").slice(1).join(" "),
        fullName: context.name,
        roleSlug: context.role,
        lastLoginAt: new Date(),
      },
    });

  // Re-fetch to get current approval status
  const updatedContext = await getUserContext(req);

  // Check if user is approved
  if (!updatedContext.isApproved && updatedContext.role !== "super_admin") {
    res.status(403).json({
      error: "Pending approval",
      message: "Your account is awaiting approval from an administrator.",
      status: "pending_approval",
    });
    return;
  }

  // Check if user can login
  if (!updatedContext.canLogin) {
    res.status(403).json({
      error: "Access denied",
      message: "Your account has been disabled.",
      status: "access_disabled",
    });
    return;
  }

  // Check if user is active
  if (!updatedContext.isActive) {
    res.status(403).json({
      error: "Account inactive",
      message: "Your account is no longer active.",
      status: "account_inactive",
    });
    return;
  }

  (
    req as typeof req & { userContext: ReturnType<typeof getUserContext> }
  ).userContext = updatedContext;
  next();
};

function requireRole(roles: string[]): RequestHandler {
  return (req, res, next) => {
    const context =
      (req as typeof req & { userContext?: ReturnType<typeof getUserContext> })
        .userContext ?? getUserContext(req);
    if (
      context.role === "super_admin" ||
      context.email === ADMIN_EMAIL ||
      roles.includes(context.role)
    ) {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden", requiredRoles: roles });
  };
}

function probabilityFor(stage: string) {
  return (
    {
      lead: 12,
      qualified: 34,
      site_visit: 45,
      loi: 56,
      due_diligence: 68,
      closing: 82,
      won: 100,
      lost: 0,
    }[stage] ?? 25
  );
}

function weightFor(activity: string, impact?: string) {
  const base =
    {
      "Cold Outreach": 1,
      "Underwriting Model": 3,
      "Site Tour": 4,
      "LOI Drafted": 5,
      "Closing Documentation": 7,
      "Mandate Approval": 6,
      "Investor Update": 4,
    }[activity] ?? 1;
  const multiplier = impact === "High" ? 2 : impact === "Low" ? 0.5 : 1;
  return base * multiplier;
}

async function recordActivity(
  actor: string,
  action: string,
  module: string,
  impact: string,
) {
  await db.insert(activityTable).values({
    id: id("activity"),
    timestamp: now(),
    actor,
    action,
    module,
    impact,
  });
}

async function sendNotification(
  subject: string,
  message: string,
  module: string,
  recipient = ADMIN_EMAIL,
) {
  let status = "queued_email_provider_required";
  let providerResponse =
    "No EMAIL_WEBHOOK_URL configured; notification stored for email delivery audit.";
  if (process.env.EMAIL_WEBHOOK_URL) {
    const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: recipient, subject, message, module }),
    });
    status = response.ok ? "sent" : "provider_error";
    providerResponse = await response.text();
  }
  const [notification] = await db
    .insert(notificationsTable)
    .values({
      id: id("notification"),
      recipient,
      subject,
      message,
      module,
      status,
      providerResponse,
      createdAt: now(),
    })
    .returning();
  return notification;
}

async function ensureSeeded() {
  const existingContacts = await db
    .select({ count: sql<number>`count(*)` })
    .from(contactsTable);

  if (Number(existingContacts[0]?.count ?? 0) === 0) {
    await db.insert(contactsTable).values([
      {
        id: "contact_001",
        name: "Amina Okonkwo",
        category: "investor",
        company: "Okonkwo Family Office",
        email: "amina@okonkwofo.com",
        phone: "+254 701 555 0140",
        relationshipOwner: "Investor Relations",
        status: "active",
        capitalPreference:
          "Ksh 200M - Ksh 800M, income-yielding retail and mixed-use",
        accessTier: "investor_portal",
        lastInteraction: "2026-04-09",
      },
      {
        id: "contact_002",
        name: "Kofi Mensah",
        category: "landlord",
        company: "Mensah Holdings",
        email: "kofi@mensahholdings.com",
        phone: "+254 302 555 201",
        relationshipOwner: "Property Acquisition",
        status: "onboarding",
        capitalPreference: "Mandate conversion and asset disposition",
        accessTier: "landlord_portal",
        lastInteraction: "2026-04-08",
      },
      {
        id: "contact_003",
        name: "Grace Ndlovu",
        category: "tenant",
        company: "Ndlovu Logistics",
        email: "grace@ndlvrlogistics.com",
        phone: "+254 11 555 7281",
        relationshipOwner: "Operations",
        status: "active",
        capitalPreference: "Lease renewal and service support",
        accessTier: "tenant_portal",
        lastInteraction: "2026-04-10",
      },
    ]);

    await db.insert(propertiesTable).values([
      {
        id: "property_001",
        name: "Victoria Island Grade A Office",
        location: "Lagos, Nigeria",
        assetClass: "Office",
        askingPrice: 14500000,
        yield: 8.2,
        status: "active",
        mandateType: "exclusive",
        owner: "Mensah Holdings",
        publishToWebsite: true,
        mandateHealth: "Exclusive mandate valid for 74 days",
      },
      {
        id: "property_002",
        name: "Airport Road Logistics Park",
        location: "Accra, Ghana",
        assetClass: "Industrial",
        askingPrice: 9200000,
        yield: 10.6,
        status: "under_offer",
        mandateType: "open",
        owner: "Asare Capital",
        publishToWebsite: false,
        mandateHealth: "Offer review; internal visibility only",
      },
      {
        id: "property_003",
        name: "Sandton Mixed-Use Corner",
        location: "Johannesburg, South Africa",
        assetClass: "Mixed-use",
        askingPrice: 18750000,
        yield: 7.7,
        status: "mandate_pending",
        mandateType: "ats_pending",
        owner: "Ndlovu Trust",
        publishToWebsite: false,
        mandateHealth: "ATS awaiting legal approval",
      },
    ]);

    await db.insert(dealsTable).values([
      {
        id: "deal_001",
        title: "Okonkwo FO acquisition review",
        propertyName: "Victoria Island Grade A Office",
        investorName: "Amina Okonkwo",
        stage: "due_diligence",
        value: 14500000,
        owner: "Investor Relations",
        nextStep: "Send IC pack and tenancy schedule",
        closeDate: "2026-05-24",
        probability: 68,
      },
      {
        id: "deal_002",
        title: "Institutional logistics mandate",
        propertyName: "Airport Road Logistics Park",
        investorName: "Northgate Pension Fund",
        stage: "loi",
        value: 9200000,
        owner: "Sales",
        nextStep: "Negotiate LOI conditions",
        closeDate: "2026-05-10",
        probability: 56,
      },
      {
        id: "deal_003",
        title: "Sandton off-market pre-brief",
        propertyName: "Sandton Mixed-Use Corner",
        investorName: "Mandela Capital",
        stage: "qualified",
        value: 18750000,
        owner: "Relationship Management",
        nextStep: "Mandate approval before distribution",
        closeDate: "2026-06-12",
        probability: 34,
      },
    ]);

    await db.insert(tasksTable).values([
      {
        id: "task_001",
        title: "Approve ATS agreement for Sandton asset",
        department: "Legal & Compliance",
        priority: "critical",
        status: "awaiting_approval",
        owner: "Executive Admin",
        dueDate: "2026-04-13",
      },
      {
        id: "task_002",
        title: "Refresh investor brief for Victoria Island office",
        department: "Marketing",
        priority: "high",
        status: "in_progress",
        owner: "Marketing Lead",
        dueDate: "2026-04-15",
      },
      {
        id: "task_003",
        title: "Validate payment processor readiness",
        department: "Finance",
        priority: "medium",
        status: "submitted",
        owner: "Finance Ops",
        dueDate: "2026-04-18",
      },
    ]);

    await db.insert(documentsTable).values([
      {
        id: "doc_001",
        title: "Victoria Island Investment Memorandum",
        type: "Investor Brief",
        linkedRecord: "Victoria Island Grade A Office",
        confidentiality: "restricted",
        approvalStatus: "approved",
        agreementStatus: "executed",
        fileName: null,
        filePath: null,
        uploadedAt: null,
      },
      {
        id: "doc_002",
        title: "Sandton ATS Draft",
        type: "Mandate",
        linkedRecord: "Sandton Mixed-Use Corner",
        confidentiality: "board_only",
        approvalStatus: "review",
        agreementStatus: "awaiting_signature",
        fileName: null,
        filePath: null,
        uploadedAt: null,
      },
      {
        id: "doc_003",
        title: "Disaster Recovery Runbook",
        type: "Operations Manual",
        linkedRecord: "Murivest OS",
        confidentiality: "internal",
        approvalStatus: "approved",
        agreementStatus: "approved",
        fileName: null,
        filePath: null,
        uploadedAt: null,
      },
    ]);

    await db.insert(financeRecordsTable).values([
      {
        id: "fin_001",
        description: "Projected commission: Victoria Island office",
        category: "Commission Revenue",
        amount: 435000,
        status: "forecast",
        owner: "Finance",
      },
      {
        id: "fin_002",
        description: "Marketing campaign budget: Q2 investor distribution",
        category: "Operating Cost",
        amount: 42000,
        status: "approved",
        owner: "Marketing",
      },
      {
        id: "fin_003",
        description: "Document verification and legal diligence",
        category: "Legal Payable",
        amount: 18500,
        status: "pending",
        owner: "Legal & Compliance",
      },
    ]);

    await db.insert(activityTable).values([
      {
        id: "activity_001",
        timestamp: "2026-04-11 08:15",
        actor: "Executive Admin",
        action: "Flagged Sandton ATS for approval",
        module: "Property & Mandates",
        impact: "Prevents off-market distribution until authority is confirmed",
      },
      {
        id: "activity_002",
        timestamp: "2026-04-11 09:05",
        actor: "Investor Relations",
        action: "Moved Okonkwo FO review to due diligence",
        module: "Deals",
        impact: "Pipeline probability increased to 68%",
      },
      {
        id: "activity_003",
        timestamp: "2026-04-11 10:20",
        actor: "Operations",
        action: "Published DR and support procedures",
        module: "Maintenance & Support",
        impact: "RTO/RPO controls visible to leadership",
      },
    ]);
  }

  const existingLegal = await db
    .select({ count: sql<number>`count(*)` })
    .from(legalMattersTable);
  if (Number(existingLegal[0]?.count ?? 0) === 0) {
    await db
      .insert(legalMattersTable)
      .values([
        {
          id: "legal_001",
          title: "Sandton ATS approval",
          matterType: "ATS / Mandate",
          linkedRecord: "Sandton Mixed-Use Corner",
          owner: "General Counsel",
          status: "awaiting_signature",
          priority: "critical",
          jurisdiction: "South Africa",
          deadline: "2026-04-13",
          exposureAmount: 18750000,
          nextAction:
            "Confirm landlord authority and approve controlled distribution",
        },
        {
          id: "legal_002",
          title: "Victoria Island diligence pack",
          matterType: "Due Diligence",
          linkedRecord: "Okonkwo FO acquisition review",
          owner: "Legal Operations",
          status: "in_review",
          priority: "high",
          jurisdiction: "Nigeria",
          deadline: "2026-04-19",
          exposureAmount: 14500000,
          nextAction: "Complete title, tenancy schedule and encumbrance review",
        },
        {
          id: "legal_003",
          title: "Airport Road lease estoppel",
          matterType: "Lease / Tenant",
          linkedRecord: "Airport Road Logistics Park",
          owner: "Compliance Lead",
          status: "open",
          priority: "medium",
          jurisdiction: "Ghana",
          deadline: "2026-04-26",
          exposureAmount: 9200000,
          nextAction:
            "Collect tenant confirmations before LOI counterparty review",
        },
        {
          id: "legal_004",
          title: "Cross-border investor KYC refresh",
          matterType: "Compliance / KYC",
          linkedRecord: "Investor Portal",
          owner: "Compliance Lead",
          status: "scheduled",
          priority: "high",
          jurisdiction: "Multi-jurisdiction",
          deadline: "2026-05-02",
          exposureAmount: 0,
          nextAction:
            "Refresh KYC, NDA and sanctions screening rules for investor access",
        },
      ])
      .onConflictDoNothing();
  }

  const existingOps = await db
    .select({ count: sql<number>`count(*)` })
    .from(operatingRecordsTable);
  if (Number(existingOps[0]?.count ?? 0) === 0) {
    await db
      .insert(operatingRecordsTable)
      .values([
        {
          id: "op_daily_001",
          module: "daily-log",
          title: "Investor update completed",
          category: "Investor Update",
          status: "done",
          owner: "Admin",
          relatedParty: "Okonkwo Family Office",
          amount: 8,
          date: today(),
          dueDate: "2026-04-14",
          priority: "High",
          details: "Shared revised IC pack and next due-diligence sequence.",
          metadata: { impact: "High", score: 8, followUp: "Board IC check-in" },
        },
        {
          id: "op_traffic_001",
          module: "traffic-log",
          title: "Lagos site traffic prospect",
          category: "Warm",
          status: "warm",
          owner: "Sales",
          relatedParty: "Prospective tenant",
          amount: null,
          date: today(),
          dueDate: "2026-04-18",
          priority: "Medium",
          details:
            "Visited Victoria Island office, requested service charge details.",
          metadata: {
            phone: "+234 802 555 0101",
            email: "prospect@example.com",
            estate: "Victoria Island",
          },
        },
        {
          id: "op_flag_001",
          module: "flagship-tasks",
          title: "Draft LOI for anchor tenant",
          category: "Flagship Task",
          status: "in_progress",
          owner: "Mark",
          relatedParty: "Airport Road Logistics Park",
          amount: null,
          date: today(),
          dueDate: "2026-04-19",
          priority: "High",
          details: "Prepare LOI pack and velocity risk notes.",
          metadata: { velocityHealth: "Accelerating" },
        },
        {
          id: "op_capital_001",
          module: "capital-partners",
          title: "Dubai family office mandate",
          category: "Tier 1",
          status: "active",
          owner: "Investor Relations",
          relatedParty: "Dubai Family Office",
          amount: 12000000,
          date: today(),
          dueDate: "2026-05-01",
          priority: "High",
          details:
            "Core-plus African logistics allocation with 60% likelihood.",
          metadata: { region: "Dubai", probability: 0.6, mandate: "Core-Plus" },
        },
        {
          id: "op_mandate_001",
          module: "mandates",
          title: "Sandton authority to sell",
          category: "Exclusive ATS",
          status: "awaiting_approval",
          owner: "Executive Admin",
          relatedParty: "Ndlovu Trust",
          amount: 18750000,
          date: today(),
          dueDate: "2026-04-13",
          priority: "Critical",
          details:
            "Authority to sell requires executive and legal approval before distribution.",
          metadata: {
            commission: "Negotiated",
            fee: 0.02,
            broker: "Lead Broker",
          },
        },
        {
          id: "op_accounting_001",
          module: "accounting",
          title: "April commission accrual journal",
          category: "Journal Entry",
          status: "posted",
          owner: "Finance",
          relatedParty: "Victoria Island Office",
          amount: 435000,
          date: today(),
          dueDate: "2026-04-30",
          priority: "High",
          details:
            "Revenue recognition pending deal close; tax estimate and reconciliation attached.",
          metadata: {
            debit: "Accounts Receivable",
            credit: "Commission Revenue",
            tax: 32625,
            cashAccount: "KES Operating",
          },
        },
        {
          id: "op_marketing_001",
          module: "marketing",
          title: "Q2 institutional investor campaign",
          category: "Campaign",
          status: "scheduled",
          owner: "Marketing",
          relatedParty: "Northgate Pension Fund",
          amount: 42000,
          date: today(),
          dueDate: "2026-05-10",
          priority: "Medium",
          details:
            "Content calendar, social distribution, listing teaser and lead attribution ready.",
          metadata: {
            channel: "LinkedIn / Email",
            attribution: "Institutional outbound",
            contentCalendar: "Weekly market notes",
          },
        },
        {
          id: "op_hr_001",
          module: "hr-academy",
          title: "Mandate approval training",
          category: "Murivest Academy Course",
          status: "active",
          owner: "HR / Academy",
          relatedParty: "Internal Team",
          amount: null,
          date: today(),
          dueDate: "2026-04-22",
          priority: "High",
          details:
            "Employee success course covering ATS controls, CRM hygiene and approval cadence.",
          metadata: { completion: 42, playbook: "Mandate Governance" },
        },
        {
          id: "op_it_001",
          module: "it-product",
          title: "Document upload signed URL workflow",
          category: "Release",
          status: "released",
          owner: "IT / Product",
          relatedParty: "Murivest OS",
          amount: null,
          date: today(),
          dueDate: "2026-04-12",
          priority: "Critical",
          details:
            "Bug/release tracker confirms private object storage route and document vault integration.",
          metadata: { release: "v1.1", severity: "Critical", area: "Storage" },
        },
        {
          id: "op_cap_suite_001",
          module: "capital-suite",
          title: "Executive capital manual",
          category: "Manual / Library",
          status: "published",
          owner: "Executive Office",
          relatedParty: "Board",
          amount: null,
          date: today(),
          dueDate: "2026-04-25",
          priority: "Medium",
          details:
            "Capital matching thesis, board pack library, investor segmentation and portfolio strategy playbook.",
          metadata: { library: "Capital Suite", sections: 12 },
        },
        {
          id: "op_meeting_001",
          module: "meetings-kpis",
          title: "Weekly operating review",
          category: "Meeting / KPI Review",
          status: "scheduled",
          owner: "Executive Admin",
          relatedParty: "All Departments",
          amount: null,
          date: today(),
          dueDate: "2026-04-16",
          priority: "High",
          details:
            "Review pipeline velocity, mandate approvals, legal exposure, finance exceptions and employee success courses.",
          metadata: {
            kpis: ["Weighted AUM", "Approval SLA", "Pipeline momentum"],
          },
        },
        {
          id: "op_legalbill_001",
          module: "legal-billing",
          title: "External counsel billing table",
          category: "Legal Billing",
          status: "pending_review",
          owner: "Legal Operations",
          relatedParty: "External Legal Co",
          amount: 18500,
          date: today(),
          dueDate: "2026-04-20",
          priority: "Medium",
          details:
            "Matter-coded legal invoice awaiting approval against Sandton ATS scope.",
          metadata: { hours: 22, rate: 840.9, matter: "Sandton ATS approval" },
        },
        {
          id: "op_dispute_001",
          module: "disputes-litigation",
          title: "Tenant arrears dispute tracker",
          category: "Dispute",
          status: "open",
          owner: "Legal Counsel",
          relatedParty: "Ndlovu Logistics",
          amount: 62000,
          date: today(),
          dueDate: "2026-05-04",
          priority: "High",
          details:
            "Litigation risk, negotiation path and evidence checklist tracked for tenant dispute.",
          metadata: {
            jurisdiction: "South Africa",
            risk: "Medium",
            nextHearing: "TBD",
          },
        },
        {
          id: "op_lease_001",
          module: "lease-workflows",
          title: "Airport Road lease legal workflow",
          category: "Lease Workflow",
          status: "in_review",
          owner: "Compliance Lead",
          relatedParty: "Airport Road Logistics Park",
          amount: 9200000,
          date: today(),
          dueDate: "2026-04-26",
          priority: "Medium",
          details:
            "Lease abstraction, estoppel collection, renewal calendar and tenant notice workflow.",
          metadata: { stage: "Estoppel", leaseExpiry: "2027-12-31" },
        },
      ])
      .onConflictDoNothing();
  }
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSeeded();
    next();
  } catch (error) {
    next(error);
  }
});

router.use("/murivest", requireAuth);

router.get("/murivest/me", async (req, res) => {
  const context = (
    req as typeof req & { userContext: ReturnType<typeof getUserContext> }
  ).userContext;
  res.json({
    ...context,
    permissions:
      context.role === "super_admin"
        ? ["all"]
        : [context.department, context.role],
  });
});

router.get("/murivest/command-center", async (_req, res) => {
  const [contacts, properties, deals, tasks, legal, operating, notifications] =
    await Promise.all([
      db.select().from(contactsTable),
      db.select().from(propertiesTable),
      db.select().from(dealsTable),
      db.select().from(tasksTable),
      db.select().from(legalMattersTable),
      db.select().from(operatingRecordsTable),
      db.select().from(notificationsTable),
    ]);
  const pipelineValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedAum = deals.reduce(
    (sum, deal) => sum + deal.value * (deal.probability / 100),
    0,
  );
  const activeMandates =
    operating.filter(
      (record) =>
        record.module === "mandates" &&
        !["closed", "rejected"].includes(record.status),
    ).length +
    properties.filter((property) =>
      ["active", "under_offer"].includes(property.status),
    ).length;
  const criticalTasks =
    tasks.filter(
      (task) =>
        task.priority === "critical" || task.status === "awaiting_approval",
    ).length +
    operating.filter(
      (record) =>
        record.status.includes("approval") || record.priority === "Critical",
    ).length;
  const legalExposure =
    legal.reduce((sum, matter) => sum + matter.exposureAmount, 0) +
    operating
      .filter((record) =>
        ["disputes-litigation", "legal-billing"].includes(record.module),
      )
      .reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
  const momentum = operating
    .filter((record) => record.module === "daily-log")
    .reduce(
      (sum, record) =>
        sum + Number(record.metadata.score ?? record.amount ?? 0),
      0,
    );
  const stages = [
    "lead",
    "qualified",
    "site_visit",
    "loi",
    "due_diligence",
    "closing",
    "won",
    "lost",
  ].map((stage) => ({
    stage,
    value: deals
      .filter((deal) => deal.stage === stage)
      .reduce((sum, deal) => sum + deal.value, 0),
    count: deals.filter((deal) => deal.stage === stage).length,
  }));
  res.json({
    date: today(),
    executiveBrief:
      "Murivest OS is now structured as a login-protected operating layer for daily execution, pipeline, mandates, properties, approvals, portals, accounting, marketing, HR, IT/Product, legal, document storage and BI reporting.",
    metrics: [
      {
        label: "Pipeline value",
        value: `Ksh ${pipelineValue.toLocaleString()}`,
        trend: `Ksh ${Math.round(weightedAum).toLocaleString()} weighted AUM`,
        tone: "positive",
      },
      {
        label: "Active mandates",
        value: String(activeMandates),
        trend: "Includes ATS, landlord authority and property mandates",
        tone: "positive",
      },
      {
        label: "Legal exposure",
        value:
          legalExposure > 0
            ? `Ksh ${legalExposure.toLocaleString()}`
            : "Controlled",
        trend: `${legal.length} legal matters plus legal billing/disputes`,
        tone: "warning",
      },
      {
        label: "Approval pressure",
        value: String(criticalTasks),
        trend: "Mandates, tasks and workflows awaiting action",
        tone: criticalTasks > 0 ? "warning" : "positive",
      },
      {
        label: "7-day momentum",
        value: String(momentum),
        trend: "Daily log weighted score from previous command centre logic",
        tone: "positive",
      },
      {
        label: "Email queue",
        value: String(notifications.length),
        trend: `Notifications addressed to ${ADMIN_EMAIL}`,
        tone: "neutral",
      },
    ],
    pipelineByStage: stages,
    operatingRisks: [
      "Mandate authority must be approved before off-market distribution",
      "Legal, KYC, NDA and sanctions checks gate investor portal visibility",
      "Email notifications are persisted and will send when an email webhook/provider is connected",
      "Accounting journals, costs, tax and reconciliations should be reviewed at weekly operating cadence",
    ],
    hbrRecommendations: [
      "Operate from one company source of truth",
      "Treat approvals as a measured executive bottleneck",
      "Use portals to separate investor, landlord and tenant permissions",
      "Convert every recurring process into a recorded workflow, KPI or playbook",
    ],
  });
});

router.get("/murivest/operating-model", (_req, res) => {
  res.json({
    departments: [
      {
        id: "exec",
        name: "Executive / Admin",
        purpose:
          "Full command, approvals, permissions and board-ready reporting",
        kpis: ["Revenue", "Approval SLA", "Risk exposure", "BI readiness"],
        interactsWith: ["All departments", "All portals"],
      },
      {
        id: "finance",
        name: "Accounting & Finance",
        purpose:
          "Statements, taxes, revenue, costs, cash accounts, journal entries and reconciliations",
        kpis: ["Cash visibility", "Tax reserve", "Reconciliation completion"],
        interactsWith: ["Deals", "Legal", "Executive"],
      },
      {
        id: "marketing",
        name: "Marketing & Growth",
        purpose:
          "Campaigns, social media, content calendar and lead attribution",
        kpis: ["Campaign ROI", "Lead source", "Content cadence"],
        interactsWith: ["Sales", "Property", "Investor Relations"],
      },
      {
        id: "academy",
        name: "HR / Murivest Academy",
        purpose: "Employee records, training, playbooks and success courses",
        kpis: ["Completion", "Onboarding cycle", "Course outcomes"],
        interactsWith: ["All departments"],
      },
      {
        id: "it",
        name: "IT / Product",
        purpose:
          "Bugs, releases, roadmap, integrations and support reliability",
        kpis: ["Release cadence", "Bug SLA", "Uptime"],
        interactsWith: ["Support", "Operations", "All departments"],
      },
      {
        id: "legal",
        name: "Legal & Compliance",
        purpose:
          "Legal Co portal, billing, disputes, leases, diligence and authority controls",
        kpis: ["Matter cycle", "Dispute exposure", "Lease compliance"],
        interactsWith: ["Portals", "Finance", "Deals"],
      },
    ],
    modules: [
      {
        id: "command",
        name: "Command Centre",
        scope:
          "Daily log, traffic, flagship tasks, pipeline, capital partners and mandates",
        owners: ["Executive", "Operations"],
      },
      {
        id: "portals",
        name: "Investor / Landlord / Tenant Portals",
        scope: "Separate authenticated screens with role boundaries",
        owners: ["Admin", "Operations"],
      },
      {
        id: "accounting",
        name: "Accounting System",
        scope:
          "Statements, taxes, revenue, costs, journals and reconciliations",
        owners: ["Finance"],
      },
      {
        id: "legal",
        name: "Advanced Legal",
        scope:
          "External counsel, legal billing, disputes, lease workflow and signed agreements",
        owners: ["Legal"],
      },
      {
        id: "bi",
        name: "Analytics Warehouse",
        scope:
          "Weighted AUM, pipeline velocity, KPI reviews, operating reports and BI cards",
        owners: ["Executive"],
      },
    ],
    accessMatrix: [
      {
        role: "super_admin",
        access:
          "Full platform CRUD, approvals, notifications and portal override",
        restrictions: "None",
      },
      {
        role: "finance",
        access: "Accounting, statements, reconciliations and finance reports",
        restrictions: "No private HR records unless assigned",
      },
      {
        role: "legal",
        access: "Legal matters, billing, disputes, leases and approval gates",
        restrictions:
          "Portal and finance exports only when linked to legal matter",
      },
      {
        role: "investor",
        access: "Investor portal opportunities, approved documents and updates",
        restrictions: "No landlord, tenant or internal workspaces",
      },
      {
        role: "landlord",
        access: "Landlord portal properties, mandates and inquiries",
        restrictions: "No investor lists or internal valuations",
      },
      {
        role: "tenant",
        access: "Tenant portal lease, service and notices",
        restrictions: "No owner/investor records",
      },
    ],
    workflowMap: [
      {
        from: "Daily Log",
        to: "Approvals",
        handoff: "Work done becomes follow-up, score and notification evidence",
      },
      {
        from: "Mandates",
        to: "Legal",
        handoff: "ATS authority moves to legal approval before publication",
      },
      {
        from: "Deals",
        to: "Finance",
        handoff:
          "Probability drives weighted AUM, revenue forecast and journal entry",
      },
      {
        from: "Marketing",
        to: "CRM",
        handoff: "Campaign source becomes lead attribution",
      },
      {
        from: "IT/Product",
        to: "Academy",
        handoff: "Releases and bugs become playbooks and training updates",
      },
    ],
  });
});

function crudRoutes(
  path: string,
  table: typeof contactsTable,
  bodySchema: typeof ContactBody,
  prefix: string,
  key: string,
) {
  router.get(path, async (_req, res) =>
    res.json(await db.select().from(table)),
  );
  router.post(path, async (req, res) => {
    const body = bodySchema.parse(req.body);
    const values =
      key === "contact"
        ? { ...body, id: id(prefix), lastInteraction: today() }
        : { ...body, id: id(prefix) };
    const [created] = await db
      .insert(table)
      .values(values as never)
      .returning();
    res.status(201).json(created);
  });
}

router.get(
  "/murivest/contacts",
  requireRole(["internal_team", "sales", "investor_relations"]),
  async (_req, res) => res.json(await db.select().from(contactsTable)),
);
router.post(
  "/murivest/contacts",
  requireRole(["super_admin", "internal_team", "sales", "investor_relations"]),
  async (req, res) => {
    try {
      const input = req.body;
      const validated = ContactBody.parse({
        firstName: input.firstName || input.name?.split(" ")[0] || "Unknown",
        lastName:
          input.lastName || input.name?.split(" ").slice(1).join(" ") || "",
        fullName: input.name || "",
        name: input.name || "",
        category: input.category || input.contactCategory || "other",
        contactType: input.contactType || input.category || "other",
        email: input.email || "",
        phone: input.phone || "",
        whatsapp: input.whatsapp || "",
        title: input.title || "",
        city: input.city || "",
        country: input.country || "Kenya",
        relationshipOwner: input.relationshipOwner || "Investor Relations",
        status: input.status || "new",
        source: input.source || "",
        accessTier: input.accessTier || "internal",
        lastInteraction: today(),
        lastInteractionAt: new Date(),
      });
      const [created] = await db
        .insert(contactsTable)
        .values({ ...validated, id: id("contact") })
        .returning();
      res.status(201).json(created);
    } catch (err) {
      console.error("Contact create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch(
  "/murivest/contacts/:id",
  requireRole(["internal_team", "sales", "investor_relations"]),
  async (req, res) => {
    const body = ContactBody.partial().parse(req.body);
    const [updated] = await db
      .update(contactsTable)
      .set({ ...body, lastInteraction: today() })
      .where(eq(contactsTable.id, req.params.id))
      .returning();
    res.json(updated);
  },
);
router.delete(
  "/murivest/contacts/:id",
  requireRole(["internal_team", "sales", "investor_relations"]),
  async (req, res) => {
    const [deleted] = await db
      .delete(contactsTable)
      .where(eq(contactsTable.id, req.params.id))
      .returning();
    res.json(deleted);
  },
);

router.get("/murivest/properties", async (_req, res) =>
  res.json(await db.select().from(propertiesTable)),
);
router.post(
  "/murivest/properties",
  requireRole(["super_admin", "internal_team", "property", "legal"]),
  async (req, res) => {
    try {
      const input = req.body;
      const validated = PropertyBody.parse({
        name: input.name || input.title || "",
        title: input.title || input.name || "",
        location: input.location || input.locationText || "",
        locationText: input.locationText || input.location || "",
        propertyType: input.propertyType || input.assetClass || "office",
        propertyClass: input.propertyClass || input.assetClass || "office",
        askingPrice: input.askingPrice || input.asking_price || 0,
        askingPriceKes: input.askingPriceKes || input.askingPrice || 0,
        yield: input.yield || input.headlineYield || 0,
        headlineYield: input.headlineYield || input.yield || 0,
        status: input.status || "draft",
        mandateType: input.mandateType || input.mandate_type || "exclusive",
        owner: input.owner || "",
        publishToWebsite: input.publishToWebsite || false,
        publishToInvestorPortal: input.publishToInvestorPortal || false,
        visibilityLevel: input.visibilityLevel || "internal",
        country: input.country || "Kenya",
        city: input.city || input.location || "Nairobi",
      });
      const [created] = await db
        .insert(propertiesTable)
        .values({ ...validated, id: id("property") })
        .returning();

      await sendNotification(
        "New property / mandate created",
        `${validated.name || validated.title} has been added for mandate control.`,
        "properties",
      );
      res.status(201).json(created);
    } catch (err) {
      console.error("Property create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch(
  "/murivest/properties/:id",
  requireRole(["internal_team", "property", "legal"]),
  async (req, res) => {
    const body = PropertyBody.partial().parse(req.body);
    const [updated] = await db
      .update(propertiesTable)
      .set({
        ...body,
        mandateHealth:
          body.mandateType === "exclusive"
            ? "Exclusive mandate under control"
            : "Mandate requires active monitoring",
      })
      .where(eq(propertiesTable.id, req.params.id))
      .returning();
    res.json(updated);
  },
);
router.delete(
  "/murivest/properties/:id",
  requireRole(["internal_team", "property"]),
  async (req, res) =>
    res.json(
      (
        await db
          .delete(propertiesTable)
          .where(eq(propertiesTable.id, req.params.id))
          .returning()
      )[0],
    ),
);

router.get("/murivest/deals", async (_req, res) =>
  res.json(await db.select().from(dealsTable)),
);
router.post(
  "/murivest/deals",
  requireRole(["super_admin", "internal_team", "sales", "investor_relations"]),
  async (req, res) => {
    try {
      const input = req.body;
      const stage = input.stage || "identified";
      const validated = DealBody.parse({
        title: input.title || "",
        propertyName: input.propertyName || "",
        investorName: input.investorName || "",
        stage: stage,
        value: input.value || input.valueKes || 0,
        valueKes: input.valueKes || input.value || 0,
        probability: probabilityFor(stage),
        closeProbability: probabilityFor(stage),
        expectedCloseDate:
          input.expectedCloseDate || input.expected_close_date || "",
        closeDate: input.closeDate || "",
        nextStep: input.nextStep || "",
        owner: input.owner || "",
      });
      const [created] = await db
        .insert(dealsTable)
        .values({ ...validated, id: id("deal") })
        .returning();

      await sendNotification(
        "Pipeline deal update",
        `${validated.title} entered ${validated.stage}. Next step: ${validated.nextStep}`,
        "deals",
      );
      res.status(201).json(created);
    } catch (err) {
      console.error("Deal create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch(
  "/murivest/deals/:id",
  requireRole(["internal_team", "sales", "investor_relations"]),
  async (req, res) => {
    const body = DealBody.partial().parse(req.body);
    const [updated] = await db
      .update(dealsTable)
      .set({
        ...body,
        ...(body.stage ? { probability: probabilityFor(body.stage) } : {}),
      })
      .where(eq(dealsTable.id, req.params.id))
      .returning();
    await sendNotification(
      "Pipeline deal edited",
      `${updated?.title ?? req.params.id} was updated in Murivest OS.`,
      "deals",
    );
    res.json(updated);
  },
);
router.delete(
  "/murivest/deals/:id",
  requireRole(["internal_team", "sales"]),
  async (req, res) =>
    res.json(
      (
        await db
          .delete(dealsTable)
          .where(eq(dealsTable.id, req.params.id))
          .returning()
      )[0],
    ),
);

router.get("/murivest/tasks", async (_req, res) =>
  res.json(await db.select().from(tasksTable)),
);
router.post(
  "/murivest/tasks",
  requireRole(["super_admin", "internal_team"]),
  async (req, res) => {
    try {
      const input = req.body;
      const validated = TaskBody.parse({
        title: input.title || "",
        description: input.description || "",
        taskType: input.taskType || "general",
        department: input.department || "Operations",
        departmentCode: input.departmentCode || input.department,
        owner: input.owner || "",
        priority: input.priority || "medium",
        status: input.status || "not_started",
        dueDate: input.dueDate || "",
        dueAt: input.dueDate ? new Date(input.dueDate) : null,
      });
      const [created] = await db
        .insert(tasksTable)
        .values({ ...validated, id: id("task") })
        .returning();
      res.status(201).json(created);
    } catch (err) {
      console.error("Task create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch("/murivest/tasks/:id", async (req, res) =>
  res.json(
    (
      await db
        .update(tasksTable)
        .set(TaskBody.partial().parse(req.body))
        .where(eq(tasksTable.id, req.params.id))
        .returning()
    )[0],
  ),
);
router.delete("/murivest/tasks/:id", async (req, res) =>
  res.json(
    (
      await db
        .delete(tasksTable)
        .where(eq(tasksTable.id, req.params.id))
        .returning()
    )[0],
  ),
);

router.get("/murivest/documents", async (_req, res) =>
  res.json(await db.select().from(documentsTable)),
);
router.post(
  "/murivest/documents",
  requireRole(["super_admin", "internal_team"]),
  async (req, res) => {
    try {
      const input = req.body;
      const validated = DocumentBody.parse({
        title: input.title || "",
        type: input.type || "Other",
        fileName: input.fileName || "",
        filePath: input.filePath || "",
        mimeType: input.mimeType || "",
        linkedRecord: input.linkedRecord || "",
        entityType: input.entityType || "",
        confidentiality: input.confidentiality || "internal",
        confidentialityLevel:
          input.confidentialityLevel || input.confidentiality || "internal",
        approvalStatus: input.approvalStatus || "draft",
        agreementStatus: input.agreementStatus || "",
        uploadedAt: input.filePath ? new Date() : null,
      });
      const [created] = await db
        .insert(documentsTable)
        .values({ ...validated, id: id("doc") })
        .returning();
      res.status(201).json(created);
    } catch (err) {
      console.error("Document create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch("/murivest/documents/:id", async (req, res) =>
  res.json(
    (
      await db
        .update(documentsTable)
        .set(DocumentBody.partial().parse(req.body))
        .where(eq(documentsTable.id, req.params.id))
        .returning()
    )[0],
  ),
);
router.delete("/murivest/documents/:id", async (req, res) =>
  res.json(
    (
      await db
        .delete(documentsTable)
        .where(eq(documentsTable.id, req.params.id))
        .returning()
    )[0],
  ),
);

router.get(
  "/murivest/legal",
  requireRole(["internal_team", "legal"]),
  async (_req, res) => res.json(await db.select().from(legalMattersTable)),
);
router.post(
  "/murivest/legal",
  requireRole(["internal_team", "legal"]),
  async (req, res) => {
    try {
      const input = req.body;
      const validated = LegalMatterBody.parse({
        title: input.title || "",
        matterType: input.matterType || "Other",
        linkedRecord: input.linkedRecord || "",
        linkedEntityType: input.linkedEntityType || "",
        owner: input.owner || "",
        status: input.status || "open",
        priority: input.priority || "medium",
        jurisdiction: input.jurisdiction || "",
        deadline: input.deadline || "",
        deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
        exposureAmount: Number(input.exposureAmount) || 0,
        exposureAmountKes:
          Number(input.exposureAmountKes) || Number(input.exposureAmount) || 0,
        nextAction: input.nextAction || "",
      });
      const [created] = await db
        .insert(legalMattersTable)
        .values({ ...validated, id: id("legal") })
        .returning();
      await sendNotification(
        "Legal matter opened",
        `${validated.title}: ${validated.nextAction}`,
        "legal",
      );
      res.status(201).json(created);
    } catch (err) {
      console.error("Legal matter create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch(
  "/murivest/legal/:id",
  requireRole(["internal_team", "legal"]),
  async (req, res) =>
    res.json(
      (
        await db
          .update(legalMattersTable)
          .set(LegalMatterBody.partial().parse(req.body))
          .where(eq(legalMattersTable.id, req.params.id))
          .returning()
      )[0],
    ),
);
router.delete(
  "/murivest/legal/:id",
  requireRole(["internal_team", "legal"]),
  async (req, res) =>
    res.json(
      (
        await db
          .delete(legalMattersTable)
          .where(eq(legalMattersTable.id, req.params.id))
          .returning()
      )[0],
    ),
);

router.get(
  "/murivest/finance",
  requireRole(["finance", "internal_team"]),
  async (_req, res) => res.json(await db.select().from(financeRecordsTable)),
);
router.post(
  "/murivest/finance",
  requireRole(["finance", "internal_team"]),
  async (req, res) => {
    try {
      const input = req.body;
      const validated = FinanceBody.parse({
        description: input.description || "",
        category: input.category || "Other",
        amount: Number(input.amount) || 0,
        amountKes: Number(input.amountKes) || Number(input.amount) || 0,
        status: input.status || "pending",
        owner: input.owner || "",
      });
      res.status(201).json(
        (
          await db
            .insert(financeRecordsTable)
            .values({ ...validated, id: id("fin") })
            .returning()
        )[0],
      );
    } catch (err) {
      console.error("Finance create error:", err);
      res.status(400).json({ error: String(err) });
    }
  },
);
router.patch(
  "/murivest/finance/:id",
  requireRole(["finance", "internal_team"]),
  async (req, res) =>
    res.json(
      (
        await db
          .update(financeRecordsTable)
          .set(FinanceBody.partial().parse(req.body))
          .where(eq(financeRecordsTable.id, req.params.id))
          .returning()
      )[0],
    ),
);
router.delete(
  "/murivest/finance/:id",
  requireRole(["finance", "internal_team"]),
  async (req, res) =>
    res.json(
      (
        await db
          .delete(financeRecordsTable)
          .where(eq(financeRecordsTable.id, req.params.id))
          .returning()
      )[0],
    ),
);

router.get("/murivest/records/:module", async (req, res) => {
  const module = moduleEnum.parse(req.params.module);
  res.json(
    await db
      .select()
      .from(operatingRecordsTable)
      .where(eq(operatingRecordsTable.module, module)),
  );
});
router.post("/murivest/records/:module", async (req, res) => {
  try {
    const module = moduleEnum.parse(req.params.module);
    const input = req.body;
    const validated = OperatingBody.parse({
      module,
      title: input.title || "",
      category: input.category || "General",
      status: input.status || "pending",
      owner: input.owner || "",
      relatedParty: input.relatedParty || "",
      amount: Number(input.amount) || 0,
      amountKes: Number(input.amountKes) || Number(input.amount) || 0,
      date: input.date || today(),
      dueDate: input.dueDate || "",
      priority: input.priority || "Medium",
      details: input.details || "",
      metadata: input.metadata || {},
    });
    const enriched =
      module === "daily-log"
        ? {
            ...validated,
            amount: weightFor(validated.category, validated.priority),
            metadata: {
              ...validated.metadata,
              score: weightFor(validated.category, validated.priority),
            },
          }
        : validated;
    const [created] = await db
      .insert(operatingRecordsTable)
      .values({ ...enriched, id: id("op") })
      .returning();
    if (
      ["mandates", "daily-log", "capital-partners", "meetings-kpis"].includes(
        module,
      )
    )
      await sendNotification(
        `Murivest ${module} update`,
        `${validated.title}: ${validated.details}`,
        module,
      );
    await recordActivity(
      "Murivest OS",
      `Created ${validated.title}`,
      module,
      validated.details,
    );
    res.status(201).json(created);
  } catch (err) {
    console.error("Operating record create error:", err);
    res.status(400).json({ error: String(err) });
  }
});
router.patch("/murivest/records/:module/:id", async (req, res) => {
  moduleEnum.parse(req.params.module);
  const body = OperatingBody.partial().parse({
    ...req.body,
    module: req.params.module,
  });
  const [updated] = await db
    .update(operatingRecordsTable)
    .set(body)
    .where(eq(operatingRecordsTable.id, req.params.id))
    .returning();
  if (
    updated?.status?.includes("approved") ||
    updated?.status?.includes("rejected")
  )
    await sendNotification(
      "Murivest approval action",
      `${updated.title} status changed to ${updated.status}.`,
      updated.module,
    );
  res.json(updated);
});
router.delete("/murivest/records/:module/:id", async (req, res) => {
  moduleEnum.parse(req.params.module);
  res.json(
    (
      await db
        .delete(operatingRecordsTable)
        .where(eq(operatingRecordsTable.id, req.params.id))
        .returning()
    )[0],
  );
});

router.get("/murivest/portal/:portal", async (req, res) => {
  const portal = z
    .enum(["investor", "landlord", "tenant"])
    .parse(req.params.portal);
  const context = (
    req as typeof req & { userContext: ReturnType<typeof getUserContext> }
  ).userContext;
  if (context.role !== "super_admin" && context.role !== portal) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [contacts, properties, deals, documents, records] = await Promise.all([
    db.select().from(contactsTable),
    db.select().from(propertiesTable),
    db.select().from(dealsTable),
    db.select().from(documentsTable),
    db.select().from(operatingRecordsTable),
  ]);
  res.json({
    portal,
    userRole: context.role,
    contacts: contacts.filter((contact) => contact.category === portal),
    properties:
      portal === "landlord"
        ? properties
        : properties.filter(
            (property) =>
              property.publishToWebsite || context.role === "super_admin",
          ),
    deals:
      portal === "investor" || context.role === "super_admin"
        ? deals.filter((deal) => deal.stage !== "lost")
        : [],
    documents: documents.filter((document) =>
      ["approved", "review"].includes(document.approvalStatus),
    ),
    records: records.filter(
      (record) =>
        record.module.includes(portal) ||
        ["meetings-kpis", "lease-workflows"].includes(record.module),
    ),
  });
});

router.get(
  "/murivest/notifications",
  requireRole(["internal_team", "finance", "legal"]),
  async (_req, res) => res.json(await db.select().from(notificationsTable)),
);
router.post(
  "/murivest/notifications",
  requireRole(["internal_team", "finance", "legal"]),
  async (req, res) => {
    const body = NotificationBody.parse(req.body);
    res
      .status(201)
      .json(
        await sendNotification(
          body.subject,
          body.message,
          body.module,
          body.recipient,
        ),
      );
  },
);

router.get("/murivest/activity", async (_req, res) =>
  res.json(await db.select().from(activityTable)),
);
router.get(
  "/murivest/users",
  requireRole(["internal_team"]),
  async (_req, res) => res.json(await db.select().from(usersTable)),
);
router.get("/murivest/integrations", (_req, res) => {
  res.json([
    {
      id: "int_email",
      service: "Transactional email",
      domain:
        "Approvals, deal updates and mandate actions to murivestrealty@gmail.com",
      status: process.env.EMAIL_WEBHOOK_URL
        ? "ready"
        : "queued_provider_required",
      pattern: "Webhook-backed send with database audit trail",
      recoveryControl: "Stored queue plus provider response logging",
    },
    {
      id: "int_storage",
      service: "Google Cloud Storage",
      domain: "Document vault, signed agreements and private file delivery",
      status: "ready",
      pattern: "Signed PUT URLs and protected object serving",
      recoveryControl: "Object path stored on document records",
    },
    {
      id: "int_clerk",
      service: "Clerk authentication",
      domain: "Admin login and role-based access",
      status: "ready",
      pattern: "Cookie sessions with server route enforcement",
      recoveryControl: "User role sync into Murivest database",
    },
    {
      id: "int_kyc",
      service: "KYC / AML screening provider",
      domain: "Investor onboarding, sanctions checks and legal eligibility",
      status: "ready",
      pattern: "Manual legal review queue now; provider API pluggable",
      recoveryControl: "Compliance exception records",
    },
  ]);
});

router.get("/murivest/lookup/users", async (_req, res) => {
  const users = await db.select().from(usersTable);
  res.json(
    users.map((u) => ({ value: u.fullName, label: u.fullName, id: u.id })),
  );
});

router.get("/murivest/lookup/properties", async (_req, res) => {
  const properties = await db.select().from(propertiesTable);
  res.json(
    properties.map((p) => ({
      value: p.name || p.title,
      label: p.name || p.title,
      id: p.id,
    })),
  );
});

router.get("/murivest/lookup/companies", async (_req, res) => {
  const companies = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.category, "landlord"));
  res.json(
    companies.map((c) => ({
      value: c.fullName || c.name,
      label: c.fullName || c.name,
      id: c.id,
    })),
  );
});

router.get("/murivest/lookup/contacts", async (_req, res) => {
  const contacts = await db.select().from(contactsTable);
  res.json(
    contacts.map((c) => ({
      value: c.fullName || c.name,
      label: c.fullName || c.name,
      id: c.id,
      category: c.category,
    })),
  );
});

router.get("/murivest/lookup/properties", async (_req, res) => {
  const properties = await db.select().from(propertiesTable);
  res.json(
    properties.map((p) => ({
      value: p.name || p.title,
      label: p.name || p.title,
      id: p.id,
    })),
  );
});

router.get("/murivest/lookup/companies", async (_req, res) => {
  const companies = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.category, "landlord"));
  res.json(
    companies.map((c) => ({
      value: c.fullName || c.name,
      label: c.fullName || c.name,
      id: c.id,
    })),
  );
});

router.get("/murivest/lookup/contacts", async (_req, res) => {
  const contacts = await db.select().from(contactsTable);
  res.json(
    contacts.map((c) => ({
      value: c.fullName || c.name,
      label: c.fullName || c.name,
      id: c.id,
      category: c.category,
    })),
  );
});

router.get("/murivest/lookup/departments", async (_req, res) => {
  res.json([
    { value: "Executive", label: "Executive" },
    { value: "Sales", label: "Sales" },
    { value: "Investor Relations", label: "Investor Relations" },
    { value: "Acquisitions", label: "Acquisitions" },
    { value: "Marketing", label: "Marketing" },
    { value: "Finance", label: "Finance" },
    { value: "Legal", label: "Legal" },
    { value: "Operations", label: "Operations" },
    { value: "HR", label: "HR" },
    { value: "IT", label: "IT" },
  ]);
});

router.get("/murivest/lookup/pipeline-owners", async (_req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users.map((u) => ({ value: u.fullName, label: u.fullName })));
});

router.patch(
  "/murivest/admin/users/:userId/approve",
  requireRole(["super_admin"]),
  async (req, res) => {
    const { userId } = req.params;
    const { role, isApproved, canLogin, isActive } = req.body;
    const context = (
      req as typeof req & { userContext: ReturnType<typeof getUserContext> }
    ).userContext;

    const updateData: Record<string, unknown> = {
      roleSlug: role,
      departmentId: null,
    };

    if (isApproved !== undefined) {
      updateData.isApproved = isApproved;
      updateData.approvedAt = isApproved ? new Date() : null;
    }

    if (canLogin !== undefined) {
      updateData.canLogin = canLogin;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    res.json(updated);
  },
);

router.patch(
  "/murivest/admin/users/:userId/reject",
  requireRole(["super_admin"]),
  async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    const [updated] = await db
      .update(usersTable)
      .set({
        isApproved: false,
        canLogin: false,
        isActive: false,
        approvedAt: null,
      })
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    await sendNotification(
      "User Access Rejected",
      `Your access to Murivest OS has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
      "admin",
    );

    res.json(updated);
  },
);

router.post(
  "/murivest/admin/users/:userId/activate",
  requireRole(["super_admin"]),
  async (req, res) => {
    const { userId } = req.params;

    const [updated] = await db
      .update(usersTable)
      .set({
        isApproved: true,
        canLogin: true,
        isActive: true,
        approvedAt: new Date(),
      })
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    await sendNotification(
      "User Access Approved",
      "Your access to Murivest OS has been approved. You can now log in.",
      "admin",
    );

    res.json(updated);
  },
);

router.post(
  "/murivest/admin/users/:userId/deactivate",
  requireRole(["super_admin"]),
  async (req, res) => {
    const { userId } = req.params;

    const [updated] = await db
      .update(usersTable)
      .set({
        canLogin: false,
        isActive: false,
      })
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    res.json(updated);
  },
);

router.get(
  "/murivest/admin/pending-users",
  requireRole(["super_admin"]),
  async (_req, res) => {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.isApproved, false));
    res.json(users);
  },
);

router.get(
  "/murivest/admin/all-users",
  requireRole(["super_admin"]),
  async (_req, res) => {
    const users = await db.select().from(usersTable);
    res.json(users);
  },
);

export default router;
