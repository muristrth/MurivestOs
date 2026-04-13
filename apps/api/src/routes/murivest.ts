import crypto from "node:crypto";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import {
  activityTable,
  contactsTable,
  dealsTable,
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
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const asyncHandler =
  (
    fn: (req: any, res: any, next: any) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

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

const portalEnum = z.enum(["investor", "landlord", "tenant"]);

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

const DealBody = insertDealSchema
  .omit({ id: true, probability: true })
  .extend({
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

type UserContext = {
  userId: string | null;
  email: string;
  name: string;
  role: string;
  department: string;
  isApproved: boolean;
  isActive: boolean;
  canLogin: boolean;
};

type AuthedRequest = Parameters<RequestHandler>[0] & {
  userContext?: UserContext;
};

async function getUserContext(req: Parameters<RequestHandler>[0]): Promise<UserContext> {
  const auth = getAuth(req);
  const claims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
  const publicMetadata = (claims.publicMetadata ?? {}) as Record<string, unknown>;
  const metadata = (claims.metadata ?? {}) as Record<string, unknown>;

  const email = String(
    claims.email ??
      claims.primary_email_address ??
      claims.email_address ??
      "authenticated-user@murivest.local",
  ).toLowerCase();

  let dbRole: string | null = null;
  let dbIsApproved: boolean | null = null;
  let dbIsActive: boolean | null = null;
  let dbCanLogin: boolean | null = null;

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

  const isSuperAdmin = role === "super_admin" || email === ADMIN_EMAIL;

  return {
    userId: auth.userId ?? null,
    email,
    name: String(claims.name ?? email),
    role,
    department,
    isApproved: dbIsApproved ?? isSuperAdmin,
    isActive: dbIsActive ?? true,
    canLogin: dbCanLogin ?? true,
  };
}

const requireAuth: RequestHandler = asyncHandler(async (req, res, next) => {
  const context = await getUserContext(req);

  if (!context.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await db
    .insert(usersTable)
    .values({
      id: `user_${context.userId}`,
      clerkUserId: context.userId,
      email: context.email,
      firstName: context.name.split(" ")[0] || "",
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
        firstName: context.name.split(" ")[0] || "",
        lastName: context.name.split(" ").slice(1).join(" "),
        fullName: context.name,
        roleSlug: context.role,
        lastLoginAt: new Date(),
      },
    });

  const updatedContext = await getUserContext(req);

  if (!updatedContext.isApproved && updatedContext.role !== "super_admin") {
    res.status(403).json({
      error: "Pending approval",
      message: "Your account is awaiting approval from an administrator.",
      status: "pending_approval",
    });
    return;
  }

  if (!updatedContext.canLogin) {
    res.status(403).json({
      error: "Access denied",
      message: "Your account has been disabled.",
      status: "access_disabled",
    });
    return;
  }

  if (!updatedContext.isActive) {
    res.status(403).json({
      error: "Account inactive",
      message: "Your account is no longer active.",
      status: "account_inactive",
    });
    return;
  }

  (req as AuthedRequest).userContext = updatedContext;
  next();
});

function requireRole(roles: string[]): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const context =
      (req as AuthedRequest).userContext ?? (await getUserContext(req));

    if (
      context.role === "super_admin" ||
      context.email === ADMIN_EMAIL ||
      roles.includes(context.role)
    ) {
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden", requiredRoles: roles });
  });
}

function probabilityFor(stage: string) {
  return (
    {
      lead: 12,
      identified: 20,
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
    id: makeId("activity"),
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
    "No EMAIL_WEBHOOK_URL configured; notification stored for audit only.";

  if (process.env.EMAIL_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, subject, message, module }),
      });

      status = response.ok ? "sent" : "provider_error";
      providerResponse = await response.text();
    } catch (error) {
      status = "provider_error";
      providerResponse =
        error instanceof Error ? error.message : "Unknown webhook error";
    }
  }

  const [notification] = await db
    .insert(notificationsTable)
    .values({
      id: makeId("notification"),
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

router.use("/murivest", requireAuth);

router.get(
  "/murivest/me",
  asyncHandler(async (req, res) => {
    const context = (req as AuthedRequest).userContext!;
    res.json({
      ...context,
      permissions:
        context.role === "super_admin"
          ? ["all"]
          : [context.department, context.role],
    });
  }),
);

router.get(
  "/murivest/command-center",
  asyncHandler(async (_req, res) => {
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

    const pipelineValue = deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);
    const weightedAum = deals.reduce(
      (sum, deal) => sum + Number(deal.value ?? 0) * (Number(deal.probability ?? 0) / 100),
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
      legal.reduce((sum, matter) => sum + Number(matter.exposureAmount ?? 0), 0) +
      operating
        .filter((record) =>
          ["disputes-litigation", "legal-billing"].includes(record.module),
        )
        .reduce((sum, record) => sum + Number(record.amount ?? 0), 0);

    const momentum = operating
      .filter((record) => record.module === "daily-log")
      .reduce(
        (sum, record) =>
          sum + Number((record.metadata as Record<string, unknown> | null)?.score ?? record.amount ?? 0),
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
        .reduce((sum, deal) => sum + Number(deal.value ?? 0), 0),
      count: deals.filter((deal) => deal.stage === stage).length,
    }));

    res.json({
      date: today(),
      executiveBrief:
        "Murivest OS command centre is reading live records from Supabase.",
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
          trend: "Derived from daily log records in Supabase",
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
    });
  }),
);

router.get(
  "/murivest/operating-model",
  asyncHandler(async (_req, res) => {
    res.json({
      departments: [
        {
          id: "exec",
          name: "Executive / Admin",
          purpose: "Full command, approvals, permissions and board-ready reporting",
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
          purpose: "Campaigns, social media, content calendar and lead attribution",
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
          purpose: "Bugs, releases, roadmap, integrations and support reliability",
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
    });
  }),
);

router.get(
  "/murivest/contacts",
  requireRole(["internal_team", "sales", "investor_relations"]),
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(contactsTable));
  }),
);

router.post(
  "/murivest/contacts",
  requireRole(["super_admin", "internal_team", "sales", "investor_relations"]),
  asyncHandler(async (req, res) => {
    const input = req.body;
    const validated = ContactBody.parse({
      firstName: input.firstName || input.name?.split(" ")[0] || "Unknown",
      lastName: input.lastName || input.name?.split(" ").slice(1).join(" ") || "",
      fullName: input.fullName || input.name || "",
      name: input.name || input.fullName || "",
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
    });

    const [created] = await db
      .insert(contactsTable)
      .values({
        ...validated,
        id: makeId("contact"),
        lastInteraction: today(),
        lastInteractionAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/contacts/:id",
  requireRole(["internal_team", "sales", "investor_relations"]),
  asyncHandler(async (req, res) => {
    const body = ContactBody.partial().parse(req.body);
    const [updated] = await db
      .update(contactsTable)
      .set({ ...body, lastInteraction: today() })
      .where(eq(contactsTable.id, req.params.id))
      .returning();

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/contacts/:id",
  requireRole(["internal_team", "sales", "investor_relations"]),
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(contactsTable)
      .where(eq(contactsTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/properties",
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(propertiesTable));
  }),
);

router.post(
  "/murivest/properties",
  requireRole(["super_admin", "internal_team", "property", "legal"]),
  asyncHandler(async (req, res) => {
    const input = req.body;

    const validated = PropertyBody.parse({
      name: input.name || input.title || "",
      title: input.title || input.name || "",
      location: input.location || input.locationText || "",
      locationText: input.locationText || input.location || "",
      propertyType: input.propertyType || input.assetClass || "office",
      propertyClass: input.propertyClass || input.assetClass || "office",
      askingPrice: Number(input.askingPrice || input.asking_price || 0),
      askingPriceKes: Number(input.askingPriceKes || input.askingPrice || 0),
      yield: Number(input.yield || input.headlineYield || 0),
      headlineYield: Number(input.headlineYield || input.yield || 0),
      status: input.status || "draft",
      mandateType: input.mandateType || input.mandate_type || "exclusive",
      owner: input.owner || "",
      publishToWebsite: Boolean(input.publishToWebsite),
      publishToInvestorPortal: Boolean(input.publishToInvestorPortal),
      visibilityLevel: input.visibilityLevel || "internal",
      country: input.country || "Kenya",
      city: input.city || "Nairobi",
    });

    const [created] = await db
      .insert(propertiesTable)
      .values({
        ...validated,
        id: makeId("property"),
        mandateHealth:
          validated.mandateType === "exclusive"
            ? "Exclusive mandate under control"
            : "Mandate requires active monitoring",
      })
      .returning();

    await sendNotification(
      "New property / mandate created",
      `${validated.name || validated.title} has been added for mandate control.`,
      "properties",
    );

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/properties/:id",
  requireRole(["internal_team", "property", "legal"]),
  asyncHandler(async (req, res) => {
    const body = PropertyBody.partial().parse(req.body);

    const [updated] = await db
      .update(propertiesTable)
      .set({
        ...body,
        ...(body.mandateType
          ? {
              mandateHealth:
                body.mandateType === "exclusive"
                  ? "Exclusive mandate under control"
                  : "Mandate requires active monitoring",
            }
          : {}),
      })
      .where(eq(propertiesTable.id, req.params.id))
      .returning();

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/properties/:id",
  requireRole(["internal_team", "property"]),
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(propertiesTable)
      .where(eq(propertiesTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/deals",
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(dealsTable));
  }),
);

router.post(
  "/murivest/deals",
  requireRole(["super_admin", "internal_team", "sales", "investor_relations"]),
  asyncHandler(async (req, res) => {
    const input = req.body;
    const stage = input.stage || "identified";

    const validated = DealBody.parse({
      title: input.title || "",
      propertyName: input.propertyName || "",
      investorName: input.investorName || "",
      stage,
      value: Number(input.value || input.valueKes || 0),
      valueKes: Number(input.valueKes || input.value || 0),
      closeProbability: probabilityFor(stage),
      expectedCloseDate: input.expectedCloseDate || input.expected_close_date || "",
      closeDate: input.closeDate || "",
      nextStep: input.nextStep || "",
      owner: input.owner || "",
    });

    const [created] = await db
      .insert(dealsTable)
      .values({
        ...validated,
        id: makeId("deal"),
        probability: probabilityFor(stage),
      })
      .returning();

    await sendNotification(
      "Pipeline deal update",
      `${validated.title} entered ${validated.stage}. Next step: ${validated.nextStep}`,
      "deals",
    );

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/deals/:id",
  requireRole(["internal_team", "sales", "investor_relations"]),
  asyncHandler(async (req, res) => {
    const body = DealBody.partial().parse(req.body);

    const [updated] = await db
      .update(dealsTable)
      .set({
        ...body,
        ...(body.stage ? { probability: probabilityFor(body.stage) } : {}),
      })
      .where(eq(dealsTable.id, req.params.id))
      .returning();

    if (updated) {
      await sendNotification(
        "Pipeline deal edited",
        `${updated.title} was updated in Murivest OS.`,
        "deals",
      );
    }

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/deals/:id",
  requireRole(["internal_team", "sales"]),
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(dealsTable)
      .where(eq(dealsTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/tasks",
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(tasksTable));
  }),
);

router.post(
  "/murivest/tasks",
  requireRole(["super_admin", "internal_team"]),
  asyncHandler(async (req, res) => {
    const input = req.body;

    const validated = TaskBody.parse({
      title: input.title || "",
      description: input.description || "",
      taskType: input.taskType || "general",
      department: input.department || "Operations",
      departmentCode: input.departmentCode || input.department || "Operations",
      owner: input.owner || "",
      priority: input.priority || "medium",
      status: input.status || "not_started",
      dueDate: input.dueDate || "",
      dueAt: input.dueDate ? new Date(input.dueDate) : null,
    });

    const [created] = await db
      .insert(tasksTable)
      .values({ ...validated, id: makeId("task") })
      .returning();

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/tasks/:id",
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(tasksTable)
      .set(TaskBody.partial().parse(req.body))
      .where(eq(tasksTable.id, req.params.id))
      .returning();

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/tasks/:id",
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(tasksTable)
      .where(eq(tasksTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/documents",
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(documentsTable));
  }),
);

router.post(
  "/murivest/documents",
  requireRole(["super_admin", "internal_team"]),
  asyncHandler(async (req, res) => {
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
    });

    const [created] = await db
      .insert(documentsTable)
      .values({
        ...validated,
        id: makeId("doc"),
        uploadedAt: validated.filePath ? new Date() : null,
      })
      .returning();

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/documents/:id",
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(documentsTable)
      .set(DocumentBody.partial().parse(req.body))
      .where(eq(documentsTable.id, req.params.id))
      .returning();

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/documents/:id",
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/legal",
  requireRole(["internal_team", "legal"]),
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(legalMattersTable));
  }),
);

router.post(
  "/murivest/legal",
  requireRole(["internal_team", "legal"]),
  asyncHandler(async (req, res) => {
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
      exposureAmount: Number(input.exposureAmount || 0),
      exposureAmountKes:
        Number(input.exposureAmountKes || input.exposureAmount || 0),
      nextAction: input.nextAction || "",
    });

    const [created] = await db
      .insert(legalMattersTable)
      .values({ ...validated, id: makeId("legal") })
      .returning();

    await sendNotification(
      "Legal matter opened",
      `${validated.title}: ${validated.nextAction}`,
      "legal",
    );

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/legal/:id",
  requireRole(["internal_team", "legal"]),
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(legalMattersTable)
      .set(LegalMatterBody.partial().parse(req.body))
      .where(eq(legalMattersTable.id, req.params.id))
      .returning();

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/legal/:id",
  requireRole(["internal_team", "legal"]),
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(legalMattersTable)
      .where(eq(legalMattersTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/finance",
  requireRole(["finance", "internal_team"]),
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(financeRecordsTable));
  }),
);

router.post(
  "/murivest/finance",
  requireRole(["finance", "internal_team"]),
  asyncHandler(async (req, res) => {
    const input = req.body;

    const validated = FinanceBody.parse({
      description: input.description || "",
      category: input.category || "Other",
      amount: Number(input.amount || 0),
      amountKes: Number(input.amountKes || input.amount || 0),
      status: input.status || "pending",
      owner: input.owner || "",
    });

    const [created] = await db
      .insert(financeRecordsTable)
      .values({ ...validated, id: makeId("fin") })
      .returning();

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/finance/:id",
  requireRole(["finance", "internal_team"]),
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(financeRecordsTable)
      .set(FinanceBody.partial().parse(req.body))
      .where(eq(financeRecordsTable.id, req.params.id))
      .returning();

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/finance/:id",
  requireRole(["finance", "internal_team"]),
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(financeRecordsTable)
      .where(eq(financeRecordsTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/records/:module",
  asyncHandler(async (req, res) => {
    const module = moduleEnum.parse(req.params.module);

    const records = await db
      .select()
      .from(operatingRecordsTable)
      .where(eq(operatingRecordsTable.module, module));

    res.json(records);
  }),
);

router.post(
  "/murivest/records/:module",
  asyncHandler(async (req, res) => {
    const module = moduleEnum.parse(req.params.module);
    const input = req.body;

    const validated = OperatingBody.parse({
      module,
      title: input.title || "",
      category: input.category || "General",
      status: input.status || "pending",
      owner: input.owner || "",
      relatedParty: input.relatedParty || "",
      amount: Number(input.amount || 0),
      amountKes: Number(input.amountKes || input.amount || 0),
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
              ...(validated.metadata ?? {}),
              score: weightFor(validated.category, validated.priority),
            },
          }
        : validated;

    const [created] = await db
      .insert(operatingRecordsTable)
      .values({ ...enriched, id: makeId("op") })
      .returning();

    if (
      ["mandates", "daily-log", "capital-partners", "meetings-kpis"].includes(module)
    ) {
      await sendNotification(
        `Murivest ${module} update`,
        `${validated.title}: ${validated.details}`,
        module,
      );
    }

    await recordActivity(
      "Murivest OS",
      `Created ${validated.title}`,
      module,
      validated.details,
    );

    res.status(201).json(created);
  }),
);

router.patch(
  "/murivest/records/:module/:id",
  asyncHandler(async (req, res) => {
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
    ) {
      await sendNotification(
        "Murivest approval action",
        `${updated.title} status changed to ${updated.status}.`,
        updated.module,
      );
    }

    res.json(updated ?? null);
  }),
);

router.delete(
  "/murivest/records/:module/:id",
  asyncHandler(async (req, res) => {
    moduleEnum.parse(req.params.module);

    const [deleted] = await db
      .delete(operatingRecordsTable)
      .where(eq(operatingRecordsTable.id, req.params.id))
      .returning();

    res.json(deleted ?? null);
  }),
);

router.get(
  "/murivest/portal/:portal",
  asyncHandler(async (req, res) => {
    const portal = portalEnum.parse(req.params.portal);
    const context = (req as AuthedRequest).userContext!;

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
  }),
);

router.get(
  "/murivest/notifications",
  requireRole(["internal_team", "finance", "legal"]),
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(notificationsTable));
  }),
);

router.post(
  "/murivest/notifications",
  requireRole(["internal_team", "finance", "legal"]),
  asyncHandler(async (req, res) => {
    const body = NotificationBody.parse(req.body);
    const notification = await sendNotification(
      body.subject,
      body.message,
      body.module,
      body.recipient,
    );
    res.status(201).json(notification);
  }),
);

router.get(
  "/murivest/activity",
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(activityTable));
  }),
);

router.get(
  "/murivest/users",
  requireRole(["internal_team"]),
  asyncHandler(async (_req, res) => {
    res.json(await db.select().from(usersTable));
  }),
);

router.get(
  "/murivest/integrations",
  asyncHandler(async (_req, res) => {
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
  }),
);

router.get(
  "/murivest/lookup/users",
  asyncHandler(async (_req, res) => {
    const users = await db.select().from(usersTable);
    res.json(users.map((u) => ({ value: u.fullName, label: u.fullName, id: u.id })));
  }),
);

router.get(
  "/murivest/lookup/properties",
  asyncHandler(async (_req, res) => {
    const properties = await db.select().from(propertiesTable);
    res.json(
      properties.map((p) => ({
        value: p.name || p.title,
        label: p.name || p.title,
        id: p.id,
      })),
    );
  }),
);

router.get(
  "/murivest/lookup/companies",
  asyncHandler(async (_req, res) => {
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
  }),
);

router.get(
  "/murivest/lookup/contacts",
  asyncHandler(async (_req, res) => {
    const contacts = await db.select().from(contactsTable);
    res.json(
      contacts.map((c) => ({
        value: c.fullName || c.name,
        label: c.fullName || c.name,
        id: c.id,
        category: c.category,
      })),
    );
  }),
);

router.get(
  "/murivest/lookup/departments",
  asyncHandler(async (_req, res) => {
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
  }),
);

router.get(
  "/murivest/lookup/pipeline-owners",
  asyncHandler(async (_req, res) => {
    const users = await db.select().from(usersTable);
    res.json(users.map((u) => ({ value: u.fullName, label: u.fullName })));
  }),
);

router.patch(
  "/murivest/admin/users/:userId/approve",
  requireRole(["super_admin"]),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role, isApproved, canLogin, isActive } = req.body;

    const updateData: Record<string, unknown> = {};

    if (role !== undefined) updateData.roleSlug = role;
    if (isApproved !== undefined) {
      updateData.isApproved = isApproved;
      updateData.approvedAt = isApproved ? new Date() : null;
    }
    if (canLogin !== undefined) updateData.canLogin = canLogin;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    res.json(updated ?? null);
  }),
);

router.patch(
  "/murivest/admin/users/:userId/reject",
  requireRole(["super_admin"]),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    const [targetUser] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId))
      .limit(1);

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

    if (targetUser?.email) {
      await sendNotification(
        "User Access Rejected",
        `Your access to Murivest OS has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
        "admin",
        targetUser.email,
      );
    }

    res.json(updated ?? null);
  }),
);

router.post(
  "/murivest/admin/users/:userId/activate",
  requireRole(["super_admin"]),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const [targetUser] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId))
      .limit(1);

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

    if (targetUser?.email) {
      await sendNotification(
        "User Access Approved",
        "Your access to Murivest OS has been approved. You can now log in.",
        "admin",
        targetUser.email,
      );
    }

    res.json(updated ?? null);
  }),
);

router.post(
  "/murivest/admin/users/:userId/deactivate",
  requireRole(["super_admin"]),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const [updated] = await db
      .update(usersTable)
      .set({
        canLogin: false,
        isActive: false,
      })
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    res.json(updated ?? null);
  }),
);

router.get(
  "/murivest/admin/pending-users",
  requireRole(["super_admin"]),
  asyncHandler(async (_req, res) => {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.isApproved, false));

    res.json(users);
  }),
);

router.get(
  "/murivest/admin/all-users",
  requireRole(["super_admin"]),
  asyncHandler(async (_req, res) => {
    const users = await db.select().from(usersTable);
    res.json(users);
  }),
);

export default router;