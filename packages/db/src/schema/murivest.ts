import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const currency = z.object({
  code: z.literal("KES"),
  symbol: z.literal("Ksh"),
  name: z.literal("Kenyan Shilling"),
});

export const appRolesTable = pgTable("app_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const departmentsTable = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersTable = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  userType: text("user_type").notNull().default("internal"),
  roleSlug: text("role_slug").references(() => appRolesTable.slug, {
    onUpdate: "cascade",
  }),
  departmentId: uuid("department_id").references(() => departmentsTable.id, {
    onUpdate: "cascade",
  }),
  isApproved: boolean("is_approved").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  canLogin: boolean("can_login").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const companiesTable = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  displayName: text("display_name"),
  type: text("type").notNull(),
  registrationNumber: text("registration_number"),
  taxId: text("tax_id"),
  country: text("country"),
  city: text("city"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  notes: text("notes"),
  ownerUserId: uuid("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contactsTable = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  fullName: text("full_name"),
  name: text("name"),
  category: text("category").notNull(),
  contactType: text("contact_type").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  title: text("title"),
  city: text("city"),
  country: text("country"),
  relationshipOwner: text("relationship_owner"),
  relationshipOwnerUserId: uuid("relationship_owner_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  status: text("status").notNull().default("new"),
  source: text("source"),
  trustScore: integer("trust_score"),
  engagementScore: integer("engagement_score"),
  accessTier: text("access_tier").default("internal"),
  lastInteraction: text("last_interaction"),
  lastInteractionAt: timestamp("last_interaction_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const propertiesTable = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyCode: text("property_code").unique(),
  name: text("name"),
  title: text("title").notNull(),
  propertyType: text("property_type").notNull(),
  propertyClass: text("property_class"),
  location: text("location"),
  locationText: text("location_text"),
  country: text("country").notNull(),
  city: text("city").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  askingPrice: doublePrecision("asking_price"),
  askingPriceKes: doublePrecision("asking_price_kes"),
  valuationKes: doublePrecision("valuation_kes"),
  yield: doublePrecision("yield"),
  headlineYield: doublePrecision("headline_yield"),
  occupancyRate: doublePrecision("occupancy_rate"),
  ownerCompanyId: uuid("owner_company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  ownerContactId: uuid("owner_contact_id").references(() => contactsTable.id, {
    onDelete: "set null",
  }),
  owner: text("owner"),
  acquisitionOwnerUserId: uuid("acquisition_owner_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  visibilityLevel: text("visibility_level").notNull().default("internal"),
  publishToWebsite: boolean("publish_to_website").notNull().default(false),
  publishToInvestorPortal: boolean("publish_to_investor_portal")
    .notNull()
    .default(false),
  status: text("status").notNull().default("draft"),
  mandateType: text("mandate_type"),
  mandateHealth: text("mandate_health"),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mandatesTable = pgTable("mandates", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, {
    onDelete: "cascade",
  }),
  landlordContactId: uuid("landlord_contact_id").references(
    () => contactsTable.id,
    { onDelete: "set null" },
  ),
  landlordCompanyId: uuid("landlord_company_id").references(
    () => companiesTable.id,
    { onDelete: "set null" },
  ),
  type: text("type").notNull(),
  mandateType: text("mandate_type").notNull(),
  status: text("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  expiryDate: timestamp("expiry_date"),
  exclusivityEndDate: timestamp("exclusivity_end_date"),
  askingPriceKes: doublePrecision("asking_price_kes"),
  valuationKes: doublePrecision("valuation_kes"),
  feePercent: doublePrecision("fee_percent"),
  approvedForAts: boolean("approved_for_ats").notNull().default(false),
  atsApprovedByUserId: uuid("ats_approved_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  atsApprovedAt: timestamp("ats_approved_at"),
  assignedUserId: uuid("assigned_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const investorsTable = pgTable("investors", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contactsTable.id, {
    onDelete: "cascade",
  }),
  investorType: text("investor_type").notNull(),
  ticketSizeMinKes: doublePrecision("ticket_size_min_kes"),
  ticketSizeMaxKes: doublePrecision("ticket_size_max_kes"),
  assetClassInterest: text("asset_class_interest").array(),
  geographyPreference: text("geography_preference").array(),
  targetYield: doublePrecision("target_yield"),
  riskProfile: text("risk_profile"),
  kycStatus: text("kyc_status").notNull().default("pending"),
  ndaStatus: text("nda_status").notNull().default("pending"),
  relationshipOwnerUserId: uuid("relationship_owner_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dealsTable = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealCode: text("deal_code").unique(),
  title: text("title").notNull(),
  propertyName: text("property_name"),
  propertyId: uuid("property_id").references(() => propertiesTable.id, {
    onDelete: "set null",
  }),
  investorName: text("investor_name"),
  investorContactId: uuid("investor_contact_id").references(
    () => contactsTable.id,
    { onDelete: "set null" },
  ),
  investorCompanyId: uuid("investor_company_id").references(
    () => companiesTable.id,
    { onDelete: "set null" },
  ),
  stage: text("stage").notNull().default("identified"),
  value: doublePrecision("value"),
  valueKes: doublePrecision("value_kes"),
  probability: doublePrecision("probability"),
  closeProbability: doublePrecision("close_probability"),
  expectedCloseDate: text("expected_close_date"),
  closeDate: text("close_date"),
  nextStep: text("next_step"),
  owner: text("owner"),
  leadUserId: uuid("lead_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tasksTable = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull().default("general"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  department: text("department"),
  departmentCode: text("department_code"),
  owner: text("owner"),
  ownerUserId: uuid("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  assignedByUserId: uuid("assigned_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  assignedToUserId: uuid("assigned_to_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("not_started"),
  dueAt: timestamp("due_at"),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const approvalsTable = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  approvalType: text("approval_type").notNull(),
  status: text("status").notNull().default("submitted"),
  requestedByUserId: uuid("requested_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  approvedByUserId: uuid("approved_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  decidedAt: timestamp("decided_at"),
  notes: text("notes"),
  decisionNotes: text("decision_notes"),
});

export const meetingsTable = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  meetingType: text("meeting_type").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration"),
  durationMinutes: integer("duration_minutes").notNull(),
  location: text("location"),
  owner: text("owner"),
  ownerUserId: uuid("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("scheduled"),
  attendees: jsonb("attendees").notNull().default([]),
  notes: text("notes"),
  actionItems: jsonb("action_items").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documentsTable = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: text("type"),
  fileName: text("file_name"),
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  linkedRecord: text("linked_record"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  confidentiality: text("confidentiality"),
  confidentialityLevel: text("confidentiality_level")
    .notNull()
    .default("internal"),
  approvalStatus: text("approval_status").notNull().default("draft"),
  agreementStatus: text("agreement_status"),
  uploadedByUserId: uuid("uploaded_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  uploadedAt: timestamp("uploaded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const legalMattersTable = pgTable("legal_matters", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  matterType: text("matter_type").notNull(),
  linkedRecord: text("linked_record"),
  linkedEntityType: text("linked_entity_type"),
  linkedEntityId: uuid("linked_entity_id"),
  owner: text("owner"),
  ownerUserId: uuid("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  externalLegalCompanyId: uuid("external_legal_company_id").references(
    () => companiesTable.id,
    { onDelete: "set null" },
  ),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  jurisdiction: text("jurisdiction"),
  deadline: text("deadline"),
  deadlineAt: timestamp("deadline_at"),
  exposureAmount: doublePrecision("exposure_amount"),
  exposureAmountKes: doublePrecision("exposure_amount_kes"),
  nextAction: text("next_action"),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financeRecordsTable = pgTable("finance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: doublePrecision("amount").notNull(),
  amountKes: doublePrecision("amount_kes"),
  status: text("status").notNull().default("pending"),
  owner: text("owner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceType: text("invoice_type").notNull(),
  companyId: uuid("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  contactId: uuid("contact_id").references(() => contactsTable.id, {
    onDelete: "set null",
  }),
  dealId: uuid("deal_id").references(() => dealsTable.id, {
    onDelete: "set null",
  }),
  propertyId: uuid("property_id").references(() => propertiesTable.id, {
    onDelete: "set null",
  }),
  legalMatterId: uuid("legal_matter_id").references(
    () => legalMattersTable.id,
    { onDelete: "set null" },
  ),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotalKes: doublePrecision("subtotal_kes").notNull(),
  taxKes: doublePrecision("tax_kes").notNull().default(0),
  totalKes: doublePrecision("total_kes").notNull(),
  paidAmountKes: doublePrecision("paid_amount_kes").notNull().default(0),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  approvedByUserId: uuid("approved_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const expensesTable = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amountKes: doublePrecision("amount_kes").notNull(),
  departmentCode: text("department_code"),
  department: text("department"),
  companyId: uuid("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  legalMatterId: uuid("legal_matter_id").references(
    () => legalMattersTable.id,
    { onDelete: "set null" },
  ),
  status: text("status").notNull().default("submitted"),
  submittedByUserId: uuid("submitted_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  approvedByUserId: uuid("approved_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  expenseDate: timestamp("expense_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaignsTable = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  campaignType: text("campaign_type").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("draft"),
  linkedPropertyId: uuid("linked_property_id").references(
    () => propertiesTable.id,
    { onDelete: "set null" },
  ),
  ownerUserId: uuid("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  owner: text("owner"),
  budgetKes: doublePrecision("budget_kes"),
  leadSource: text("lead_source"),
  leadsGenerated: integer("leads_generated"),
  spendKes: doublePrecision("spend_kes"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const operatingRecordsTable = pgTable("operating_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: text("module").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  owner: text("owner"),
  ownerUserId: uuid("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  relatedParty: text("related_party"),
  amount: doublePrecision("amount"),
  amountKes: doublePrecision("amount_kes"),
  date: text("date").notNull(),
  dueDate: text("due_date"),
  priority: text("priority"),
  details: text("details").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  module: text("module").notNull(),
  status: text("status").notNull().default("pending"),
  providerResponse: text("provider_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityTable = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  actor: text("actor"),
  actorUserId: uuid("actor_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  module: text("module").notNull(),
  impact: text("impact"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContactSchema = createInsertSchema(contactsTable);
export const insertPropertySchema = createInsertSchema(propertiesTable);
export const insertDealSchema = createInsertSchema(dealsTable);
export const insertTaskSchema = createInsertSchema(tasksTable);
export const insertDocumentSchema = createInsertSchema(documentsTable);
export const insertFinanceRecordSchema =
  createInsertSchema(financeRecordsTable);
export const insertLegalMatterSchema = createInsertSchema(legalMattersTable);
export const insertOperatingRecordSchema = createInsertSchema(
  operatingRecordsTable,
);
export const insertNotificationSchema = createInsertSchema(notificationsTable);
export const insertActivitySchema = createInsertSchema(activityTable);

export type ContactsRecord = z.infer<typeof insertContactSchema>;
export type PropertiesRecord = z.infer<typeof insertPropertySchema>;
export type DealsRecord = z.infer<typeof insertDealSchema>;
export type TasksRecord = z.infer<typeof insertTaskSchema>;
export type DocumentsRecord = z.infer<typeof insertDocumentSchema>;
export type FinanceRecord = z.infer<typeof insertFinanceRecordSchema>;
export type LegalMatterRecord = z.infer<typeof insertLegalMatterSchema>;
export type OperatingRecord = z.infer<typeof insertOperatingRecordSchema>;
export type NotificationRecord = z.infer<typeof insertNotificationSchema>;
export type ActivityRecord = z.infer<typeof insertActivitySchema>;

export const academyCoursesTable = pgTable("academy_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  type: text("type").notNull(),
  format: text("format").notNull().default("online"),
  contentUrl: text("content_url"),
  thumbnailUrl: text("thumbnail_url"),
  durationMinutes: integer("duration_minutes"),
  orderIndex: integer("order_index").notNull().default(0),
  targetAudience: text("target_audience"),
  prerequisites: jsonb("prerequisites").default("[]"),
  learningObjectives: jsonb("learning_objectives").default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(false),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const academyLearningPathsTable = pgTable("academy_learning_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  courseIds: jsonb("course_ids").notNull().default("[]"),
  targetRoles: jsonb("target_roles").default("[]"),
  targetDepartments: jsonb("target_departments").default("[]"),
  estimatedHours: doublePrecision("estimated_hours"),
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const academyEnrollmentsTable = pgTable("academy_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
    }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => academyCoursesTable.id, {
      onDelete: "cascade",
    }),
  status: text("status").notNull().default("not_started"),
  progressPercent: integer("progress_percent").notNull().default(0),
  score: integer("score"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  assignedByUserId: uuid("assigned_by_user_id").references(
    () => usersTable.id,
    {
      onDelete: "set null",
    },
  ),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const academyCertificationsTable = pgTable("academy_certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
    }),
  courseId: uuid("course_id").references(() => academyCoursesTable.id, {
    onDelete: "set null",
  }),
  learningPathId: uuid("learning_path_id").references(
    () => academyLearningPathsTable.id,
    {
      onDelete: "set null",
    },
  ),
  title: text("title").notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  certificateUrl: text("certificate_url"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAcademyCourseSchema =
  createInsertSchema(academyCoursesTable);
export const insertAcademyLearningPathSchema = createInsertSchema(
  academyLearningPathsTable,
);
export const insertAcademyEnrollmentSchema = createInsertSchema(
  academyEnrollmentsTable,
);
export const insertAcademyCertificationSchema = createInsertSchema(
  academyCertificationsTable,
);
