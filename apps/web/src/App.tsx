import {
  ClerkProvider,
  Show,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronRight,
  DatabaseZap,
  FileText,
  FolderLock,
  Gavel,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  Menu,
  X,
  Megaphone,
  Network,
  PanelLeft,
  PieChart as PieChartIcon,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Workflow,
  Play,
  Video,
  Library,
  Award,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  BookMarked,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Redirect,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
} from "wouter";
import { STATIC_OPTIONS, useLookup } from "./lib/options";

const FIELD_OPTIONS: Record<string, typeof STATIC_OPTIONS.contactCategory> = {
  category: STATIC_OPTIONS.contactCategory,
  contactCategory: STATIC_OPTIONS.contactCategory,
  status: STATIC_OPTIONS.contactStatus,
  contactStatus: STATIC_OPTIONS.contactStatus,
  accessTier: STATIC_OPTIONS.accessTier,
  propertyType: STATIC_OPTIONS.propertyType,
  assetClass: STATIC_OPTIONS.propertyType,
  propertyStatus: STATIC_OPTIONS.propertyStatus,
  mandateType: STATIC_OPTIONS.mandateType,
  dealStage: STATIC_OPTIONS.dealStage,
  stage: STATIC_OPTIONS.dealStage,
  priority: STATIC_OPTIONS.priority,
  taskStatus: STATIC_OPTIONS.taskStatus,
  department: STATIC_OPTIONS.department,
  owner: STATIC_OPTIONS.owner,
  relationshipOwner: STATIC_OPTIONS.owner,
  leadUser: STATIC_OPTIONS.owner,
  createdByUser: STATIC_OPTIONS.owner,
  type: STATIC_OPTIONS.documentType,
  documentType: STATIC_OPTIONS.documentType,
  confidentiality: STATIC_OPTIONS.confidentiality,
  confidentialityLevel: STATIC_OPTIONS.confidentiality,
  approvalStatus: STATIC_OPTIONS.approvalStatus,
  financeCategory: STATIC_OPTIONS.financeCategory,
  matterType: STATIC_OPTIONS.legalMatterType,
  legalMatterType: STATIC_OPTIONS.legalMatterType,
  legalStatus: STATIC_OPTIONS.legalStatus,
  jurisdiction: STATIC_OPTIONS.jurisdiction,
  channel: STATIC_OPTIONS.campaignChannel,
  campaignChannel: STATIC_OPTIONS.campaignChannel,
  campaignStatus: STATIC_OPTIONS.campaignStatus,
};

type Metric = {
  label: string;
  value: string;
  trend: string;
  tone: "positive" | "neutral" | "warning" | "critical";
};
type StageValue = { stage: string; value: number; count: number };
type CommandCenter = {
  date: string;
  executiveBrief: string;
  metrics: Metric[];
  pipelineByStage: StageValue[];
  operatingRisks: string[];
  hbrRecommendations: string[];
};
type Department = {
  id: string;
  name: string;
  purpose: string;
  kpis: string[];
  interactsWith: string[];
};
type Module = { id: string; name: string; scope: string; owners: string[] };
type AccessRule = { role: string; access: string; restrictions: string };
type WorkflowLink = { from: string; to: string; handoff: string };
type OperatingModel = {
  departments: Department[];
  modules: Module[];
  accessMatrix: AccessRule[];
  workflowMap: WorkflowLink[];
};
type Me = {
  userId: string;
  email: string;
  name: string;
  role: string;
  department: string;
  permissions: string[];
};
type Contact = {
  id: string;
  name: string;
  category: string;
  company?: string;
  email: string;
  phone?: string;
  relationshipOwner: string;
  status: string;
  capitalPreference?: string;
  accessTier: string;
  lastInteraction: string;
};
type Property = {
  id: string;
  name: string;
  location: string;
  assetClass: string;
  askingPrice: number;
  yield: number;
  status: string;
  mandateType: string;
  owner: string;
  publishToWebsite: boolean;
  mandateHealth: string;
};
type Deal = {
  id: string;
  title: string;
  propertyName: string;
  investorName: string;
  stage: string;
  value: number;
  owner: string;
  nextStep: string;
  closeDate: string;
  probability: number;
};
type Task = {
  id: string;
  title: string;
  department: string;
  priority: string;
  status: string;
  owner: string;
  dueDate: string;
};
type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  linkedRecord: string;
  confidentiality: string;
  approvalStatus: string;
  agreementStatus?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  uploadedAt?: string | null;
};
type FinanceRecord = {
  id: string;
  description: string;
  category: string;
  amount: number;
  status: string;
  owner: string;
};
type LegalMatter = {
  id: string;
  title: string;
  matterType: string;
  linkedRecord: string;
  owner: string;
  status: string;
  priority: string;
  jurisdiction: string;
  deadline: string;
  exposureAmount: number;
  nextAction: string;
};
type OperatingRecord = {
  id: string;
  module: string;
  title: string;
  category: string;
  status: string;
  owner: string;
  relatedParty?: string | null;
  amount?: number | null;
  date: string;
  dueDate?: string | null;
  priority?: string | null;
  details: string;
  metadata: Record<string, unknown>;
};
type AcademyCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: "video" | "pdf" | "document" | "assessment";
  format?: "online" | "live" | "hybrid";
  contentUrl?: string | null;
  thumbnailUrl?: string | null;
  durationMinutes?: number;
  orderIndex?: number;
  targetAudience?: string;
  prerequisites?: string[];
  learningObjectives?: string[];
  isActive?: boolean;
  isPublished?: boolean;
  status?: string;
  createdAt?: string;
};
type AcademyLearningPath = {
  id: string;
  name: string;
  description: string;
  category: string;
  courseIds?: string[];
  targetRoles?: string[];
  targetDepartments?: string[];
  estimatedHours?: number;
  isActive?: boolean;
};
type AcademyEnrollment = {
  id: string;
  userId: string;
  courseId: string;
  status: "not_started" | "in_progress" | "completed" | "failed";
  progressPercent: number;
  score?: number;
  startedAt?: string;
  completedAt?: string;
};
type NotificationRecord = {
  id: string;
  recipient: string;
  subject: string;
  message: string;
  module: string;
  status: string;
  providerResponse?: string | null;
  createdAt: string;
};
type IntegrationStatus = {
  id: string;
  service: string;
  domain: string;
  status: string;
  pattern: string;
  recoveryControl: string;
};
type ActivityItem = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  module: string;
  impact: string;
};
type PortalData = {
  portal: string;
  userRole: string;
  contacts: Contact[];
  properties: Property[];
  deals: Deal[];
  documents: DocumentRecord[];
  records: OperatingRecord[];
};
type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "checkbox" | "date" | "textarea";
};

const queryClient = new QueryClient();
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const enterpriseCoverage = [
  [
    "Daily Log",
    "Weighted execution ledger advanced from the prior Sheets command centre",
  ],
  [
    "Traffic Log",
    "Site traffic/prospect CRM with property, estate, phone, email and status",
  ],
  [
    "Pipeline Deals",
    "Weighted AUM, stage probability, close plan and email update records",
  ],
  [
    "Mandates / ATS",
    "Authority-to-sell approval flow linked to legal, documents and properties",
  ],
  [
    "Accounting",
    "Statements, taxes, revenue, costs, cash accounts, journals and reconciliations",
  ],
  [
    "Marketing",
    "Campaigns, social media, content calendar and lead attribution",
  ],
  [
    "HR / Academy",
    "Employee success courses, training, onboarding and playbooks",
  ],
  [
    "IT / Product",
    "Bug, release, roadmap and integration reliability tracking",
  ],
  [
    "Capital Suite",
    "Executive manual/library, board packs and investor strategy",
  ],
  [
    "Portals",
    "Separate investor, landlord and tenant screens with role enforcement",
  ],
  [
    "Documents",
    "Private object storage uploads and signed agreement workflows",
  ],
  [
    "Advanced Legal",
    "External counsel, legal billing, disputes, leases and compliance workflows",
  ],
];

const moduleConfigs: Record<
  string,
  {
    title: string;
    eyebrow: string;
    note: string;
    icon: typeof Activity;
    defaults: Omit<OperatingRecord, "id" | "metadata"> & {
      metadata: Record<string, unknown>;
    };
    fields: Field[];
  }
> = {
  "daily-log": {
    title: "Daily execution log",
    eyebrow: "Command centre",
    note: "Replicates the previous processDailyLog workflow with activity, counterparty, impact, follow-up and weighted score.",
    icon: Activity,
    defaults: {
      module: "daily-log",
      title: "",
      category: "Cold Outreach",
      status: "done",
      owner: "Admin",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "category", label: "Activity" },
      { name: "relatedParty", label: "Counterparty / asset" },
      { name: "priority", label: "Impact" },
      { name: "details", label: "Outcome", type: "textarea" },
      { name: "dueDate", label: "Follow-up", type: "date" },
    ],
  },
  "traffic-log": {
    title: "90-day traffic log",
    eyebrow: "Prospects",
    note: "Prospect/site-traffic ledger with the same required fields as the old terminal: name, phone, property, estate, visit date and status.",
    icon: Users,
    defaults: {
      module: "traffic-log",
      title: "",
      category: "Warm",
      status: "warm",
      owner: "Sales",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Prospect name" },
      { name: "relatedParty", label: "Property" },
      { name: "category", label: "Status" },
      {
        name: "details",
        label: "Company / phone / email / estate",
        type: "textarea",
      },
      { name: "date", label: "Date visited", type: "date" },
    ],
  },
  "flagship-tasks": {
    title: "Flagship tasks",
    eyebrow: "Execution",
    note: "Critical asset tasks with owner, deadline, status and velocity health.",
    icon: BadgeCheck,
    defaults: {
      module: "flagship-tasks",
      title: "",
      category: "Flagship Task",
      status: "in_progress",
      owner: "Mark",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "relatedParty", label: "Asset" },
      { name: "title", label: "Task" },
      { name: "status", label: "Status" },
      { name: "owner", label: "Owner" },
      { name: "dueDate", label: "Deadline", type: "date" },
      { name: "priority", label: "Priority" },
    ],
  },
  "capital-partners": {
    title: "Capital partners",
    eyebrow: "Capital",
    note: "Partner tier, mandate, region, capital size and probability tracking.",
    icon: Landmark,
    defaults: {
      module: "capital-partners",
      title: "",
      category: "Tier 1",
      status: "active",
      owner: "Investor Relations",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Partner name" },
      { name: "category", label: "Tier" },
      { name: "relatedParty", label: "Region" },
      { name: "amount", label: "Capital size", type: "number" },
      { name: "details", label: "Mandate / thesis", type: "textarea" },
    ],
  },
  mandates: {
    title: "Mandates and authority to sell",
    eyebrow: "ATS approvals",
    note: "Authority-to-sell, commission, landlord/client, approval and expiry workflows.",
    icon: ShieldCheck,
    defaults: {
      module: "mandates",
      title: "",
      category: "Exclusive ATS",
      status: "awaiting_approval",
      owner: "Executive Admin",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Critical",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Asset / mandate" },
      { name: "category", label: "Mandate type" },
      { name: "relatedParty", label: "Landlord / provider" },
      { name: "amount", label: "Asking price", type: "number" },
      { name: "status", label: "Approval status" },
      { name: "dueDate", label: "Expiry / deadline", type: "date" },
      {
        name: "details",
        label: "Terms, commission, broker and notes",
        type: "textarea",
      },
    ],
  },
  accounting: {
    title: "Accounting system",
    eyebrow: "Finance",
    note: "Statements, taxes, revenue, costs, cash accounts, journal entries and reconciliations.",
    icon: Banknote,
    defaults: {
      module: "accounting",
      title: "",
      category: "Journal Entry",
      status: "draft",
      owner: "Finance",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Entry / statement" },
      { name: "category", label: "Type" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "status", label: "Status" },
      {
        name: "details",
        label: "Debit, credit, tax, cash account, reconciliation notes",
        type: "textarea",
      },
    ],
  },
  marketing: {
    title: "Marketing system",
    eyebrow: "Growth",
    note: "Campaigns, social media, content calendar, brand governance and lead attribution.",
    icon: Megaphone,
    defaults: {
      module: "marketing",
      title: "",
      category: "Campaign",
      status: "scheduled",
      owner: "Marketing",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Campaign / content" },
      { name: "category", label: "Channel" },
      { name: "relatedParty", label: "Attribution / audience" },
      { name: "amount", label: "Budget", type: "number" },
      {
        name: "details",
        label: "Calendar, social plan and attribution notes",
        type: "textarea",
      },
    ],
  },
  "hr-academy": {
    title: "HR / Murivest Academy",
    eyebrow: "People",
    note: "Training courses, onboarding, employee success, playbooks and operating discipline.",
    icon: GraduationCap,
    defaults: {
      module: "hr-academy",
      title: "",
      category: "Course",
      status: "active",
      owner: "HR / Academy",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Course / employee success item" },
      { name: "category", label: "Type" },
      { name: "relatedParty", label: "Audience / employee" },
      { name: "status", label: "Status" },
      {
        name: "details",
        label: "Outcome, curriculum and playbook notes",
        type: "textarea",
      },
    ],
  },
  "it-product": {
    title: "IT / Product tracking",
    eyebrow: "Technology",
    note: "Bug, release, product roadmap, support and integration reliability tracker.",
    icon: DatabaseZap,
    defaults: {
      module: "it-product",
      title: "",
      category: "Bug",
      status: "open",
      owner: "IT / Product",
      relatedParty: "Murivest OS",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Bug / feature / release" },
      { name: "category", label: "Type" },
      { name: "priority", label: "Severity" },
      { name: "status", label: "Status" },
      {
        name: "details",
        label: "Acceptance, release notes and system impact",
        type: "textarea",
      },
    ],
  },
  "capital-suite": {
    title: "Executive Capital Suite",
    eyebrow: "Manual/library",
    note: "Capital manual, board library, investor strategy and portfolio intelligence.",
    icon: BookOpen,
    defaults: {
      module: "capital-suite",
      title: "",
      category: "Manual / Library",
      status: "published",
      owner: "Executive Office",
      relatedParty: "Board",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Manual / library item" },
      { name: "category", label: "Category" },
      { name: "relatedParty", label: "Audience" },
      {
        name: "details",
        label: "Contents, sequence flows and investment thesis",
        type: "textarea",
      },
    ],
  },
  "meetings-kpis": {
    title: "Meetings and KPI reviews",
    eyebrow: "Cadence",
    note: "Meeting tracking, KPI reviews, operating rhythm and board follow-through.",
    icon: CalendarClock,
    defaults: {
      module: "meetings-kpis",
      title: "",
      category: "Meeting / KPI Review",
      status: "scheduled",
      owner: "Executive Admin",
      relatedParty: "All Departments",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Meeting / review" },
      { name: "category", label: "Cadence" },
      { name: "relatedParty", label: "Departments" },
      { name: "dueDate", label: "Meeting date", type: "date" },
      {
        name: "details",
        label: "KPIs, decisions and follow-up actions",
        type: "textarea",
      },
    ],
  },
  "legal-billing": {
    title: "Legal billing and External Legal Co",
    eyebrow: "Legal finance",
    note: "External counsel portal, matter billing, invoice review and legal cost control.",
    icon: BriefcaseBusiness,
    defaults: {
      module: "legal-billing",
      title: "",
      category: "Legal Billing",
      status: "pending_review",
      owner: "Legal Operations",
      relatedParty: "External Legal Co",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Invoice / counsel matter" },
      { name: "relatedParty", label: "Legal Co / counsel" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "status", label: "Billing status" },
      {
        name: "details",
        label: "Hours, matter code, scope and approval notes",
        type: "textarea",
      },
    ],
  },
  "disputes-litigation": {
    title: "Disputes and litigation",
    eyebrow: "Risk",
    note: "Dispute exposure, litigation tracker, evidence, jurisdiction and next action.",
    icon: Gavel,
    defaults: {
      module: "disputes-litigation",
      title: "",
      category: "Dispute",
      status: "open",
      owner: "Legal Counsel",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "High",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Dispute / litigation" },
      { name: "relatedParty", label: "Counterparty" },
      { name: "amount", label: "Exposure", type: "number" },
      { name: "priority", label: "Risk" },
      {
        name: "details",
        label: "Jurisdiction, evidence and next hearing/action",
        type: "textarea",
      },
    ],
  },
  "lease-workflows": {
    title: "Lease legal workflows",
    eyebrow: "Leases",
    note: "Lease abstraction, estoppels, renewals, notice flows and tenant legal controls.",
    icon: FileText,
    defaults: {
      module: "lease-workflows",
      title: "",
      category: "Lease Workflow",
      status: "in_review",
      owner: "Compliance Lead",
      relatedParty: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      priority: "Medium",
      details: "",
      metadata: {},
    },
    fields: [
      { name: "title", label: "Lease workflow" },
      { name: "relatedParty", label: "Property / tenant" },
      { name: "category", label: "Workflow type" },
      { name: "dueDate", label: "Critical date", type: "date" },
      {
        name: "details",
        label: "Lease, renewal, estoppel and notice details",
        type: "textarea",
      },
    ],
  },
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok)
    throw new Error(`Murivest OS request failed: ${response.status}`);
  return response.json();
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function useApi<T>(key: string, path: string) {
  return useQuery({
    queryKey: [key],
    queryFn: () => api<T>(path),
    retry: false,
  });
}

function useCrud<TInput>(path: string, key: string) {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: [key] });
  return {
    create: useMutation({
      mutationFn: (input: TInput) =>
        api(path, { method: "POST", body: JSON.stringify(input) }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<TInput> }) =>
        api(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`${path}/${id}`, { method: "DELETE" }),
      onSuccess: invalidate,
    }),
  };
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      )
        queryClient.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function SignInPage() {
  return (
    <AuthFrame title="Admin sign in">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame title="Create Murivest user">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#edf1f5] px-4 py-10 text-[#0b1628]">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#d8e0ea] bg-white p-6 shadow-2xl lg:grid lg:grid-cols-[.9fr_1fr] lg:gap-8">
        <div className="rounded-[1.5rem] bg-[#081426] p-8 text-white">
          <p className="text-[11px] uppercase tracking-[.35em] text-[#80acd8]">
            Murivest Realty
          </p>
          <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#c6d6e8]">
            Secure login for admin approvals, pipeline updates, property
            mandates, daily logs, department workspaces and external portal
            controls.
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              Role-based access is enforced on the server for admin, finance,
              legal, investor, landlord and tenant users.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              To update login providers, app branding, or OAuth settings use the
              Auth pane in the workspace toolbar. More information can be found
              in the Replit docs.
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">{children}</div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/command" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-screen bg-[#edf1f5] px-4 py-8 text-[#0b1628]">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-[#d8e0ea] bg-[#081426] p-8 text-white shadow-2xl">
              <p className="text-[11px] uppercase tracking-[.34em] text-[#80acd8]">
                Murivest Realty Group
              </p>
              <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight tracking-tight">
                Murivest OS — enterprise operating platform for mandates,
                capital, legal controls and daily execution.
              </h1>
              <p className="mt-5 max-w-4xl text-sm leading-7 text-[#c6d6e8]">
                Login as admin to key in previous work, update logs, pipeline
                deals, properties and authority-to-sell approvals, manage
                departments, upload agreements and track notifications to
                murivestrealty@gmail.com.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#081426]"
                >
                  <LogIn size={16} /> Admin login
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white"
                >
                  Create user <ArrowUpRight size={16} />
                </Link>
              </div>
            </section>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {enterpriseCoverage.map(([name, detail]) => (
                <Card key={name}>
                  <h3 className="font-semibold">{name}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
                    {detail}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const me = useApi<Me>("me", "/murivest/me");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = [
    ["/command", "Command", LayoutDashboard],
    ["/command-centre", "Legacy Panels", Activity],
    ["/operating-model", "Operating Model", Network],
    ["/contacts", "CRM", Users],
    ["/properties", "Properties", Building2],
    ["/deals", "Deals", Landmark],
    ["/mandates", "ATS / Mandates", ShieldCheck],
    ["/legal", "Legal", Gavel],
    ["/documents", "Documents", FolderLock],
    ["/accounting", "Accounting", Banknote],
    ["/marketing", "Marketing", Megaphone],
    ["/hr-academy", "HR / Academy", GraduationCap],
    ["/it-product", "IT / Product", DatabaseZap],
    ["/capital-suite", "Capital Suite", BookOpen],
    ["/meetings-kpis", "Meetings / KPIs", CalendarClock],
    ["/portals/investor", "Investor Portal", BriefcaseBusiness],
    ["/portals/landlord", "Landlord Portal", Building2],
    ["/portals/tenant", "Tenant Portal", Users],
    ["/analytics-bi", "Analytics / BI", PieChartIcon],
    ["/integrations", "Integrations", Workflow],
  ] as const;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#edf1f5] text-[#0b1628]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_8%,rgba(27,64,113,.20),transparent_28%),radial-gradient(circle_at_86%_4%,rgba(190,128,62,.16),transparent_24%)]" />
      <div className="relative flex min-h-screen">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-xl bg-[#081426] text-white shadow-xl xl:hidden"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 xl:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Sidebar - desktop always visible, mobile as slide-out */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[300px] shrink-0 flex-col border-r border-white/10 bg-[#081426] text-[#dce8f7] shadow-2xl transition-transform duration-300 xl:relative xl:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} xl:flex ${mobileMenuOpen ? "flex" : "hidden"}`}
        >
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#1b4b7c] shadow-lg">
                <PanelLeft size={19} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[.28em] text-[#85a4c6]">
                  Murivest Realty
                </p>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  Murivest OS
                </h1>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#9eb2ca]">
              Enterprise operating platform for departments, portals, documents,
              approvals and BI.
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {nav.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${location === href ? "bg-[#f4f7fb] text-[#091427] shadow-xl" : "text-[#b9c9dc] hover:bg-white/8 hover:text-white"}`}
              >
                <Icon size={16} />
                <span className="truncate">{label}</span>
                <ChevronRight
                  className="ml-auto opacity-0 transition group-hover:opacity-100"
                  size={14}
                />
              </Link>
            ))}
          </nav>
          <div className="m-3 rounded-2xl border border-white/10 bg-white/7 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck size={16} />{" "}
              {me.data?.role?.replaceAll("_", " ") ?? "Secure session"}
            </div>
            <p className="mt-2 text-xs leading-5 text-[#9eb2ca]">
              {user?.primaryEmailAddress?.emailAddress ?? me.data?.email}
            </p>
            <button
              onClick={() => signOut({ redirectUrl: `${basePath}/` })}
              className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-white"
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 px-3 py-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-[1520px]">
            <header className="mb-5 grid gap-4 rounded-2xl border border-[#d8e0ea] bg-white/88 p-4 shadow-[0_18px_50px_rgba(9,20,39,.08)] backdrop-blur xl:grid-cols-[1fr_auto_auto] xl:items-center">
              {/* Spacer for mobile menu button */}
              <div className="xl:hidden" />
              <div>
                <p className="text-[11px] uppercase tracking-[.28em] text-[#58718d]">
                  Enterprise Software Division · April 2026
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  Operations Command Platform
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#d8e0ea] bg-[#f6f8fb] px-3 py-2 text-xs text-[#5d6f84]">
                <Search size={15} />
                Search master records, legal matters and mandates
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-xl bg-[#081426] px-3 py-2 text-white">
                  {me.data?.department ?? "Admin"}
                </span>
                <span className="rounded-xl border border-[#d8e0ea] bg-white px-3 py-2 text-[#40556d]">
                  Risk watch
                </span>
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="rounded-2xl border border-[#d8e0ea] bg-white p-8 text-center text-[#5d6f84]">
      Loading Murivest operating data...
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
      {message}
    </div>
  );
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const background = className.includes("bg-") ? "" : "bg-white/92";
  return (
    <section
      className={`rounded-2xl border border-[#d8e0ea] ${background} p-5 shadow-[0_16px_45px_rgba(9,20,39,.06)] ${className}`}
    >
      {children}
    </section>
  );
}
function SectionTitle({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#667f9a]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight">{title}</h3>
      {note && (
        <p className="mt-2 max-w-5xl text-sm leading-6 text-[#5d6f84]">
          {note}
        </p>
      )}
    </div>
  );
}
function StatusPill({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  const tone =
    value.includes("critical") ||
    value.includes("pending") ||
    value.includes("restricted") ||
    value.includes("awaiting") ||
    value.includes("provider")
      ? "bg-[#fff4df] text-[#925a12] border-[#f0ce95]"
      : value.includes("approved") ||
          value.includes("active") ||
          value.includes("ready") ||
          value.includes("sent") ||
          value.includes("done") ||
          value.includes("posted")
        ? "bg-[#e9f6ed] text-[#25633c] border-[#bce1c8]"
        : "bg-[#edf2f8] text-[#42576e] border-[#d7e1ed]";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${tone}`}
    >
      {label}
    </span>
  );
}

function TextInput({
  field,
  form,
  setForm,
}: {
  field: Field;
  form: Record<string, unknown>;
  setForm: (next: Record<string, unknown>) => void;
}) {
  const value = form[field.name];
  const className =
    "mt-1 w-full rounded-xl border border-[#d8e0ea] bg-white px-3 py-2.5 text-sm text-[#0b1628] outline-none focus:border-[#1b4b7c]";

  const options = FIELD_OPTIONS[field.name];
  const hasOptions = options && options.length > 0;

  if (field.type === "textarea") {
    return (
      <label className="text-xs font-medium text-[#5d6f84]">
        <span>{field.label}</span>
        <textarea
          value={String(value ?? "")}
          onChange={(event) =>
            setForm({ ...form, [field.name]: event.target.value })
          }
          className={`${className} min-h-24`}
        />
      </label>
    );
  }

  if (hasOptions) {
    return (
      <label className="text-xs font-medium text-[#5d6f84]">
        <span>{field.label}</span>
        <select
          value={String(value ?? "")}
          onChange={(event) =>
            setForm({ ...form, [field.name]: event.target.value })
          }
          className={className}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="text-xs font-medium text-[#5d6f84]">
      <span>{field.label}</span>
      {field.type === "checkbox" ? (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) =>
            setForm({ ...form, [field.name]: event.target.checked })
          }
          className="mt-3 size-5"
        />
      ) : (
        <input
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : "text"
          }
          value={
            field.type === "number" ? (value as number) : String(value ?? "")
          }
          onChange={(event) =>
            setForm({
              ...form,
              [field.name]:
                field.type === "number"
                  ? Number(event.target.value)
                  : event.target.value,
            })
          }
          className={className}
        />
      )}
    </label>
  );
}

function CrudPanel({
  title,
  defaults,
  fields,
  onSubmit,
  isSaving,
}: {
  title: string;
  defaults: Record<string, unknown>;
  fields: Field[];
  onSubmit: (input: Record<string, unknown>) => void;
  isSaving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(defaults);
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#667f9a]">
            Create
          </p>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        </div>
        <ArrowUpRight size={18} />
      </button>
      {open && (
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form);
            setForm(defaults);
            setOpen(false);
          }}
        >
          {fields.map((field) => (
            <TextInput
              key={field.name}
              field={field}
              form={form}
              setForm={setForm}
            />
          ))}
          <button
            disabled={isSaving}
            className="rounded-xl bg-[#0b1628] px-4 py-3 text-sm text-white md:col-span-2"
          >
            <Save className="mr-2 inline" size={15} />
            Save to Murivest OS
          </button>
        </form>
      )}
    </Card>
  );
}

function EditableTable({
  rows,
  columns,
  path,
  queryKey,
  fields,
  transformForEdit,
}: {
  rows: Record<string, unknown>[];
  columns: {
    key: string;
    label: string;
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  }[];
  path: string;
  queryKey: string;
  fields: Field[];
  transformForEdit?: (row: Record<string, unknown>) => Record<string, unknown>;
}) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const crud = useCrud<Record<string, unknown>>(path, queryKey);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#d8e0ea] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="bg-[#0b1628] text-[#eff5fc]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 font-medium uppercase tracking-[.12em]"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium uppercase tracking-[.12em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={String(row.id ?? index)}
                  className="border-t border-[#e3e9f1] hover:bg-[#f6f8fb]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 align-top text-[13px]"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditing(
                            transformForEdit ? transformForEdit(row) : row,
                          )
                        }
                        className="rounded-lg border border-[#d8e0ea] px-2 py-1 text-[#1b4b7c]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          window.confirm("Delete this database record?") &&
                          crud.remove.mutate(String(row.id))
                        }
                        className="rounded-lg border border-red-200 px-2 py-1 text-red-700"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing && (
        <Card>
          <SectionTitle
            eyebrow="Edit database record"
            title={String(
              editing.title ?? editing.name ?? editing.description ?? "Record",
            )}
          />
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              crud.update.mutate({ id: String(editing.id), input: editing });
              setEditing(null);
            }}
          >
            {fields.map((field) => (
              <TextInput
                key={field.name}
                field={field}
                form={editing}
                setForm={setEditing}
              />
            ))}
            <button className="rounded-xl bg-[#0b1628] px-4 py-3 text-sm text-white">
              Update record
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-[#d8e0ea] px-4 py-3 text-sm"
            >
              Cancel
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

function CommandCenterPage() {
  const center = useApi<CommandCenter>(
    "command-center",
    "/murivest/command-center",
  );
  const activity = useApi<ActivityItem[]>("activity", "/murivest/activity");
  const notifications = useApi<NotificationRecord[]>(
    "notifications",
    "/murivest/notifications",
  );
  if (center.isLoading || activity.isLoading) return <Loader />;
  if (center.error || !center.data)
    return (
      <ErrorState message="Command center data could not be loaded. Confirm you are signed in with an authorized Murivest role." />
    );
  const pieData = center.data.pipelineByStage.filter(
    (stage) => stage.value > 0,
  );
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[#081426] text-white">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[.32em] text-[#80acd8]">
              Executive Briefing
            </p>
            <h1 className="mt-3 max-w-5xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              One source of truth for daily execution, mandates, capital, legal
              risk, portals and operating cadence.
            </h1>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-[#c6d6e8]">
              {center.data.executiveBrief}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <div className="flex items-center gap-2 text-[#d9a760]">
              <Sparkles size={17} /> HBR management thesis
            </div>
            <div className="mt-3 grid gap-2">
              {center.data.hbrRecommendations.map((item) => (
                <p
                  key={item}
                  className="rounded-xl bg-black/18 p-3 text-xs leading-5 text-[#eef5fc]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {center.data.metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
              {metric.label}
            </p>
            <div className="mt-2 text-3xl font-semibold">{metric.value}</div>
            <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
              {metric.trend}
            </p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <SectionTitle
            eyebrow="Pipeline"
            title="Deal value by operating stage"
            note="Pipeline analytics connects Sales, Investor Relations, Property, Legal and Finance into one measurable flow."
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={center.data.pipelineByStage}>
                <defs>
                  <linearGradient id="pipeline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b4b7c" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#1b4b7c" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e0e7ef" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${Number(v) / 1000000}M`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => money.format(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#1b4b7c"
                  fill="url(#pipeline)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionTitle eyebrow="Control" title="Operating risks" />
          <div className="space-y-2">
            {center.data.operatingRisks.map((risk) => (
              <div
                key={risk}
                className="flex gap-2 rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-3 text-xs leading-5"
              >
                <LockKeyhole
                  className="mt-0.5 shrink-0 text-[#1b4b7c]"
                  size={15}
                />
                {risk}
              </div>
            ))}
          </div>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="stage"
                  innerRadius={42}
                  outerRadius={66}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        ["#1b4b7c", "#d9a760", "#2e6f5e", "#7b3f4d"][index % 4]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle
          eyebrow="Notifications"
          title="Email notification audit trail"
          note="Approval, mandate and deal actions are recorded for murivestrealty@gmail.com. If an email provider webhook is configured, the status changes from queued to sent."
        />
        <EditableTable
          rows={
            (notifications.data ?? []) as unknown as Record<string, unknown>[]
          }
          path="/murivest/notifications"
          queryKey="notifications"
          fields={[
            { name: "subject", label: "Subject" },
            { name: "message", label: "Message", type: "textarea" },
            { name: "module", label: "Module" },
            { name: "recipient", label: "Recipient" },
          ]}
          columns={[
            { key: "subject", label: "Subject" },
            { key: "module", label: "Module" },
            { key: "recipient", label: "Recipient" },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "createdAt", label: "Created" },
          ]}
        />
      </Card>
      <Card>
        <SectionTitle eyebrow="Activity" title="Recent operating activity" />
        <div className="grid gap-3 md:grid-cols-3">
          {(activity.data ?? []).map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-3"
            >
              <p className="text-[11px] text-[#667f9a]">
                {item.timestamp} · {item.module}
              </p>
              <h4 className="mt-2 font-semibold">{item.action}</h4>
              <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
                {item.impact}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OperatingModelPage() {
  const model = useApi<OperatingModel>(
    "operating-model",
    "/murivest/operating-model",
  );
  if (model.isLoading) return <Loader />;
  if (model.error || !model.data)
    return <ErrorState message="Operating model could not be loaded." />;
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          eyebrow="Architecture"
          title="Departments, modules and access boundaries"
          note="Murivest OS is one unified platform with role, department, portal and security separation."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {model.data.departments.map((department) => (
            <div
              key={department.id}
              className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4"
            >
              <h4 className="font-semibold">{department.name}</h4>
              <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
                {department.purpose}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {department.kpis.map((kpi) => (
                  <StatusPill key={kpi} value={kpi} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle
            eyebrow="Modules"
            title="Production operating surface"
          />
          <div className="space-y-2">
            {model.data.modules.map((module) => (
              <div key={module.id} className="rounded-xl bg-[#f8fafc] p-3">
                <h4 className="font-semibold">{module.name}</h4>
                <p className="mt-1 text-xs leading-5 text-[#5d6f84]">
                  {module.scope}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle
            eyebrow="Access"
            title="Role-based restricted visibility"
          />
          <div className="space-y-2">
            {model.data.accessMatrix.map((rule) => (
              <div
                key={rule.role}
                className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-3"
              >
                <h4 className="font-semibold">{rule.role}</h4>
                <p className="mt-1 text-xs leading-5 text-[#5d6f84]">
                  {rule.access}
                </p>
                <p className="mt-2 text-[11px] text-[#1b4b7c]">
                  Restriction: {rule.restrictions}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle eyebrow="Workflow" title="Sequence flows and approvals" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {model.data.workflowMap.map((flow) => (
            <div
              key={`${flow.from}-${flow.to}`}
              className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-3"
            >
              <Workflow className="text-[#1b4b7c]" size={17} />
              <h4 className="mt-2 text-sm font-semibold">
                {flow.from} → {flow.to}
              </h4>
              <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
                {flow.handoff}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ContactsPage() {
  const contacts = useApi<Contact[]>("contacts", "/murivest/contacts");
  const crud = useCrud<Record<string, unknown>>(
    "/murivest/contacts",
    "contacts",
  );
  const defaults = {
    name: "",
    category: "investor",
    company: "",
    email: "",
    phone: "",
    relationshipOwner: "Investor Relations",
    status: "active",
    capitalPreference: "",
    accessTier: "investor_portal",
  };
  const fields = [
    { name: "name", label: "Name" },
    { name: "category", label: "Category" },
    { name: "company", label: "Company" },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone" },
    { name: "relationshipOwner", label: "Owner" },
    { name: "status", label: "Status" },
    { name: "accessTier", label: "Access tier" },
  ];
  if (contacts.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <CrudPanel
        title="New relationship record"
        defaults={defaults}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle eyebrow="CRM" title="Unified stakeholder database" />
        <EditableTable
          rows={(contacts.data ?? []) as unknown as Record<string, unknown>[]}
          path="/murivest/contacts"
          queryKey="contacts"
          fields={fields}
          columns={[
            { key: "name", label: "Name" },
            {
              key: "category",
              label: "Category",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "company", label: "Company" },
            { key: "relationshipOwner", label: "Owner" },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "accessTier", label: "Access" },
            { key: "lastInteraction", label: "Last interaction" },
          ]}
        />
      </Card>
    </div>
  );
}

function PropertiesPage() {
  const properties = useApi<Property[]>("properties", "/murivest/properties");
  const crud = useCrud<Record<string, unknown>>(
    "/murivest/properties",
    "properties",
  );
  const defaults = {
    name: "",
    location: "",
    assetClass: "Office",
    askingPrice: 0,
    yield: 0,
    status: "mandate_pending",
    mandateType: "ats_pending",
    owner: "",
    publishToWebsite: false,
  };
  const fields: Field[] = [
    { name: "name", label: "Property" },
    { name: "location", label: "Location" },
    { name: "assetClass", label: "Asset class" },
    { name: "askingPrice", label: "Asking price", type: "number" },
    { name: "yield", label: "Yield", type: "number" },
    { name: "status", label: "Status" },
    { name: "mandateType", label: "Mandate type" },
    { name: "owner", label: "Owner" },
    { name: "publishToWebsite", label: "Publish", type: "checkbox" },
  ];
  if (properties.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <CrudPanel
        title="New property / mandate"
        defaults={defaults}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle
          eyebrow="Inventory"
          title="Property, listing and mandate control"
        />
        <EditableTable
          rows={(properties.data ?? []) as unknown as Record<string, unknown>[]}
          path="/murivest/properties"
          queryKey="properties"
          fields={fields}
          columns={[
            { key: "name", label: "Asset" },
            { key: "location", label: "Location" },
            { key: "assetClass", label: "Class" },
            {
              key: "askingPrice",
              label: "Value",
              render: (v) => money.format(Number(v)),
            },
            { key: "yield", label: "Yield", render: (v) => `${v}%` },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "mandateHealth", label: "Mandate health" },
          ]}
        />
      </Card>
    </div>
  );
}

function DealsPage() {
  const deals = useApi<Deal[]>("deals", "/murivest/deals");
  const crud = useCrud<Record<string, unknown>>("/murivest/deals", "deals");
  const defaults = {
    title: "",
    propertyName: "",
    investorName: "",
    stage: "lead",
    value: 0,
    owner: "Sales",
    nextStep: "",
    closeDate: "2026-06-30",
  };
  const fields: Field[] = [
    { name: "title", label: "Title" },
    { name: "propertyName", label: "Property" },
    { name: "investorName", label: "Investor" },
    { name: "stage", label: "Stage" },
    { name: "value", label: "Value", type: "number" },
    { name: "owner", label: "Owner" },
    { name: "nextStep", label: "Next step", type: "textarea" },
    { name: "closeDate", label: "Close date", type: "date" },
  ];
  const chart = useMemo(
    () =>
      (deals.data ?? []).map((deal) => ({
        name: deal.title.slice(0, 18),
        value: deal.value,
        probability: deal.probability,
      })),
    [deals.data],
  );
  if (deals.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <CrudPanel
        title="New pipeline opportunity"
        defaults={defaults}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle
          eyebrow="Pipeline"
          title="Deal room and investor matching"
        />
        <div className="mb-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid stroke="#e0e7ef" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${Number(v) / 1000000}M`} />
              <Tooltip formatter={(v) => money.format(Number(v))} />
              <Bar dataKey="value" fill="#1b4b7c" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <EditableTable
          rows={(deals.data ?? []) as unknown as Record<string, unknown>[]}
          path="/murivest/deals"
          queryKey="deals"
          fields={fields}
          columns={[
            { key: "title", label: "Deal" },
            { key: "propertyName", label: "Property" },
            { key: "investorName", label: "Investor" },
            {
              key: "stage",
              label: "Stage",
              render: (v) => <StatusPill value={String(v)} />,
            },
            {
              key: "value",
              label: "Value",
              render: (v) => money.format(Number(v)),
            },
            {
              key: "probability",
              label: "Probability",
              render: (v) => `${v}%`,
            },
            { key: "nextStep", label: "Next step" },
          ]}
        />
      </Card>
    </div>
  );
}

function OperatingRecordsPage({ module }: { module: string }) {
  const config = moduleConfigs[module];
  const records = useApi<OperatingRecord[]>(
    module,
    `/murivest/records/${module}`,
  );
  const crud = useCrud<Record<string, unknown>>(
    `/murivest/records/${module}`,
    module,
  );
  if (!config) return <NotFound />;
  if (records.isLoading) return <Loader />;
  const Icon = config.icon;
  const rows = (records.data ?? []) as unknown as Record<string, unknown>[];
  return (
    <div className="space-y-5">
      <Card className="bg-[#081426] text-white">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10">
            <Icon size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[.3em] text-[#80acd8]">
              {config.eyebrow}
            </p>
            <h1 className="mt-1 text-3xl font-semibold">{config.title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#c6d6e8]">
              {config.note}
            </p>
          </div>
        </div>
      </Card>
      <CrudPanel
        title={`Add ${config.title}`}
        defaults={config.defaults as unknown as Record<string, unknown>}
        fields={config.fields}
        onSubmit={(input) =>
          crud.create.mutate({ ...config.defaults, ...input, metadata: {} })
        }
      />
      <Card>
        <SectionTitle
          eyebrow="Database records"
          title="Add, edit and delete operating entries"
        />
        <EditableTable
          rows={rows}
          path={`/murivest/records/${module}`}
          queryKey={module}
          fields={config.fields}
          columns={[
            { key: "title", label: "Title" },
            { key: "category", label: "Category" },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "owner", label: "Owner" },
            { key: "relatedParty", label: "Related" },
            {
              key: "amount",
              label: "Amount",
              render: (v) => (Number(v ?? 0) ? money.format(Number(v)) : ""),
            },
            { key: "dueDate", label: "Due" },
            { key: "details", label: "Details" },
          ]}
        />
      </Card>
    </div>
  );
}

function LegalPage() {
  const legal = useApi<LegalMatter[]>("legal", "/murivest/legal");
  const crud = useCrud<Record<string, unknown>>("/murivest/legal", "legal");
  const fields: Field[] = [
    { name: "title", label: "Matter title" },
    { name: "matterType", label: "Type" },
    { name: "linkedRecord", label: "Linked record" },
    { name: "owner", label: "Owner" },
    { name: "status", label: "Status" },
    { name: "priority", label: "Priority" },
    { name: "jurisdiction", label: "Jurisdiction" },
    { name: "deadline", label: "Deadline", type: "date" },
    { name: "exposureAmount", label: "Exposure", type: "number" },
    { name: "nextAction", label: "Next action", type: "textarea" },
  ];
  const defaults = {
    title: "",
    matterType: "Due Diligence",
    linkedRecord: "",
    owner: "Legal Operations",
    status: "open",
    priority: "medium",
    jurisdiction: "Multi-jurisdiction",
    deadline: "2026-05-15",
    exposureAmount: 0,
    nextAction: "",
  };
  const matters = legal.data ?? [];
  const exposure = matters.reduce(
    (sum, matter) => sum + matter.exposureAmount,
    0,
  );
  const critical = matters.filter(
    (matter) =>
      matter.priority === "critical" || matter.status.includes("awaiting"),
  ).length;
  if (legal.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Legal exposure
          </p>
          <div className="mt-2 text-3xl font-semibold">
            {money.format(exposure)}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Priority matters
          </p>
          <div className="mt-2 text-3xl font-semibold">{critical}</div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Submodules
          </p>
          <div className="mt-2 text-2xl font-semibold">
            Billing · Disputes · Leases
          </div>
        </Card>
      </div>
      <CrudPanel
        title="New legal matter"
        defaults={defaults}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle
          eyebrow="Legal & Compliance"
          title="Matters, contracts, leases, diligence and disputes"
        />
        <EditableTable
          rows={matters as unknown as Record<string, unknown>[]}
          path="/murivest/legal"
          queryKey="legal"
          fields={fields}
          columns={[
            { key: "title", label: "Matter" },
            { key: "matterType", label: "Type" },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            {
              key: "priority",
              label: "Priority",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "jurisdiction", label: "Jurisdiction" },
            {
              key: "exposureAmount",
              label: "Exposure",
              render: (v) => money.format(Number(v)),
            },
            { key: "nextAction", label: "Next action" },
          ]}
        />
      </Card>
      <div className="grid gap-5 xl:grid-cols-3">
        <OperatingRecordsPage module="legal-billing" />
        <OperatingRecordsPage module="disputes-litigation" />
        <OperatingRecordsPage module="lease-workflows" />
      </div>
    </div>
  );
}

function TasksPage() {
  const tasks = useApi<Task[]>("tasks", "/murivest/tasks");
  const crud = useCrud<Record<string, unknown>>("/murivest/tasks", "tasks");
  const defaults = {
    title: "",
    department: "Operations",
    priority: "medium",
    status: "submitted",
    owner: "Admin",
    dueDate: "2026-04-30",
  };
  const fields: Field[] = [
    { name: "title", label: "Task" },
    { name: "department", label: "Department" },
    { name: "priority", label: "Priority" },
    { name: "status", label: "Status" },
    { name: "owner", label: "Owner" },
    { name: "dueDate", label: "Due date", type: "date" },
  ];
  if (tasks.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <CrudPanel
        title="New operational task"
        defaults={defaults}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle
          eyebrow="Execution"
          title="Issue management, support and approvals"
        />
        <EditableTable
          rows={(tasks.data ?? []) as unknown as Record<string, unknown>[]}
          path="/murivest/tasks"
          queryKey="tasks"
          fields={fields}
          columns={[
            { key: "title", label: "Task" },
            { key: "department", label: "Department" },
            {
              key: "priority",
              label: "Priority",
              render: (v) => <StatusPill value={String(v)} />,
            },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "owner", label: "Owner" },
            { key: "dueDate", label: "Due" },
          ]}
        />
      </Card>
    </div>
  );
}

function DocumentsPage() {
  const documents = useApi<DocumentRecord[]>(
    "documents",
    "/murivest/documents",
  );
  const crud = useCrud<Record<string, unknown>>(
    "/murivest/documents",
    "documents",
  );
  const [uploading, setUploading] = useState(false);
  const fields: Field[] = [
    { name: "title", label: "Title" },
    { name: "type", label: "Type" },
    { name: "linkedRecord", label: "Linked record" },
    { name: "confidentiality", label: "Confidentiality" },
    { name: "approvalStatus", label: "Approval" },
    { name: "agreementStatus", label: "Agreement status" },
    { name: "fileName", label: "File name" },
    { name: "filePath", label: "File path" },
  ];
  async function uploadDocument(file: File) {
    setUploading(true);
    try {
      const signed = await api<{ uploadURL: string; objectPath: string }>(
        "/storage/uploads/request-url",
        {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        },
      );
      const uploaded = await fetch(signed.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploaded.ok) throw new Error("Upload failed");
      crud.create.mutate({
        title: file.name,
        type: "Signed Agreement",
        linkedRecord: "Murivest OS",
        confidentiality: "restricted",
        approvalStatus: "review",
        agreementStatus: "uploaded",
        fileName: file.name,
        filePath: signed.objectPath,
      });
    } finally {
      setUploading(false);
    }
  }
  if (documents.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          eyebrow="Upload"
          title="Real document upload and signed agreement workflow"
          note="Files are uploaded using a private signed URL, then the object path is stored on the document vault record."
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0b1628] px-4 py-3 text-sm text-white">
          <Upload size={16} />{" "}
          {uploading ? "Uploading..." : "Upload agreement / document"}
          <input
            type="file"
            className="hidden"
            onChange={(event) =>
              event.target.files?.[0] && uploadDocument(event.target.files[0])
            }
          />
        </label>
      </Card>
      <CrudPanel
        title="New document record"
        defaults={{
          title: "",
          type: "Investor Brief",
          linkedRecord: "",
          confidentiality: "internal",
          approvalStatus: "draft",
          agreementStatus: "draft",
          fileName: "",
          filePath: "",
        }}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle
          eyebrow="Vault"
          title="Confidential documents and approval state"
        />
        <EditableTable
          rows={(documents.data ?? []) as unknown as Record<string, unknown>[]}
          path="/murivest/documents"
          queryKey="documents"
          fields={fields}
          columns={[
            { key: "title", label: "Document" },
            { key: "type", label: "Type" },
            { key: "linkedRecord", label: "Linked record" },
            {
              key: "confidentiality",
              label: "Confidentiality",
              render: (v) => <StatusPill value={String(v)} />,
            },
            {
              key: "approvalStatus",
              label: "Approval",
              render: (v) => <StatusPill value={String(v)} />,
            },
            {
              key: "agreementStatus",
              label: "Agreement",
              render: (v) => <StatusPill value={String(v ?? "draft")} />,
            },
            {
              key: "filePath",
              label: "File",
              render: (v) =>
                v ? (
                  <a
                    className="text-[#1b4b7c] underline"
                    href={`/api/storage${String(v)}`}
                    target="_blank"
                  >
                    Open
                  </a>
                ) : (
                  ""
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function AcademyPage() {
  const courses = useApi<AcademyCourse[]>(
    "academy-courses",
    "/api/academy/courses",
  );
  const learningPaths = useApi<AcademyLearningPath[]>(
    "academy-paths",
    "/api/academy/learning-paths",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(
    null,
  );

  const categories = [
    "All",
    ...new Set((courses.data ?? []).map((c) => c.category)),
  ];
  const types = ["All", "video", "pdf", "document"];

  const filteredCourses = (courses.data ?? []).filter((course) => {
    const categoryMatch =
      selectedCategory === "All" || course.category === selectedCategory;
    const typeMatch = selectedType === "All" || course.type === selectedType;
    return categoryMatch && typeMatch;
  });

  const totalCourses = courses.data?.length ?? 0;
  const videoCourses = (courses.data ?? []).filter(
    (c) => c.type === "video",
  ).length;
  const pdfBooks = (courses.data ?? []).filter((c) => c.type === "pdf").length;
  const documentCourses = (courses.data ?? []).filter(
    (c) => c.type === "document",
  ).length;

  if (courses.isLoading) return <Loader />;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play size={16} />;
      case "pdf":
        return <FileText size={16} />;
      case "document":
        return <BookMarked size={16} />;
      default:
        return <Library size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-500/10 text-red-600";
      case "pdf":
        return "bg-blue-500/10 text-blue-600";
      case "document":
        return "bg-green-500/10 text-green-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0
      ? `${hours}h ${mins}m`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  if (selectedCourse) {
    return (
      <div className="space-y-5">
        <Card className="bg-[#081426] text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`grid size-12 place-items-center rounded-2xl ${getTypeColor(selectedCourse.type)}`}
              >
                {getTypeIcon(selectedCourse.type)}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[.3em] text-[#80acd8]">
                  {selectedCourse.category} ·{" "}
                  {selectedCourse.type.toUpperCase()}
                </p>
                <h1 className="mt-1 text-3xl font-semibold">
                  {selectedCourse.title}
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-[#c6d6e8]">
                  {selectedCourse.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCourse(null)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              Back to Library
            </button>
          </div>
        </Card>
        <Card>
          <SectionTitle
            eyebrow="Course Content"
            title={
              selectedCourse.type === "video"
                ? "Watch Video Lesson"
                : "Read Document"
            }
          />
          <div className="mt-4 rounded-xl bg-gray-50 p-8 text-center">
            {selectedCourse.contentUrl ? (
              <div className="space-y-4">
                <div className="mx-auto size-20 rounded-full bg-[#1b4b7c]/10 flex items-center justify-center">
                  <FileText size={32} className="text-[#1b4b7c]" />
                </div>
                <p className="text-lg font-medium">Document Available</p>
                <p className="text-sm text-gray-600">
                  Click below to access the document
                </p>
                <a
                  href={selectedCourse.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1b4b7c] px-6 py-3 text-white hover:bg-[#1b4b7c]/90"
                >
                  <FileText size={18} />
                  Open Document
                </a>
              </div>
            ) : selectedCourse.type === "video" ? (
              <div className="space-y-4">
                <div className="mx-auto size-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Play size={32} className="text-red-500" />
                </div>
                <p className="text-lg font-medium">Video Lesson Content</p>
                <p className="text-sm text-gray-600">
                  Duration: {formatDuration(selectedCourse.durationMinutes)} ·
                  This module covers {selectedCourse.description.toLowerCase()}
                </p>
                <button className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-white hover:bg-red-600">
                  <Play size={18} />
                  Play Video
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto size-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <BookMarked size={32} className="text-green-500" />
                </div>
                <p className="text-lg font-medium">Reading Material</p>
                <p className="text-sm text-gray-600">
                  Estimated read time:{" "}
                  {formatDuration(selectedCourse.durationMinutes)}
                </p>
                <button className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-white hover:bg-green-600">
                  <BookMarked size={18} />
                  Start Reading
                </button>
              </div>
            )}
          </div>
        </Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
              Duration
            </p>
            <div className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              <Clock size={20} className="text-[#1b4b7c]" />
              {formatDuration(selectedCourse.durationMinutes)}
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
              Target Audience
            </p>
            <div className="mt-2 text-xl font-semibold">
              {selectedCourse.targetAudience ?? "All Employees"}
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
              Learning Format
            </p>
            <div className="mt-2 text-xl font-semibold capitalize">
              {selectedCourse.format ?? "Online"}
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
              Status
            </p>
            <div className="mt-2 text-xl font-semibold capitalize">
              {selectedCourse.status}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[#081426] text-white">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[.3em] text-[#80acd8]">
              Learning Library
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Murivest Academy</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#c6d6e8]">
              Video lessons, PDF books, scripts and documentation for all
              departments. Complete courses to earn certifications and track
              your progress.
            </p>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Total Courses
          </p>
          <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
            <Library size={24} className="text-[#1b4b7c]" />
            {totalCourses}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Video Lessons
          </p>
          <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
            <Video size={24} className="text-red-500" />
            {videoCourses}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            PDF Books
          </p>
          <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
            <FileText size={24} className="text-blue-500" />
            {pdfBooks}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Documents
          </p>
          <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
            <BookMarked size={24} className="text-green-500" />
            {documentCourses}
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle
          eyebrow="Filter Courses"
          title="Browse Learning Library"
        />
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Category:</span>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#1b4b7c] text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Type:</span>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    selectedType === t
                      ? "bg-[#1b4b7c] text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t === "All"
                    ? "All Types"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="group cursor-pointer rounded-xl border border-gray-200 p-5 transition-all hover:border-[#1b4b7c] hover:shadow-lg"
              onClick={() => setSelectedCourse(course)}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${getTypeColor(course.type)}`}
                >
                  {getTypeIcon(course.type)}
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {course.category}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#0b1628] group-hover:text-[#1b4b7c]">
                {course.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                {course.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  {formatDuration(course.durationMinutes)}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  {course.isPublished ? (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      Published
                    </>
                  ) : (
                    <>
                      <Library size={14} className="text-yellow-500" />
                      Draft
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle eyebrow="Learning Paths" title="Recommended Tracks" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-[#1b4b7c]/10">
                <Award size={24} className="text-[#1b4b7c]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Executive Track</h3>
                <p className="text-sm text-gray-600">4 courses · 3 hours</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>Executive Capital Suite Introduction</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>Capital Manual & Board Protocols</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock size={12} className="text-yellow-600" />
                </div>
                <span>Analytics & BI Dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Target size={12} className="text-gray-400" />
                </div>
                <span>Leadership & Strategy</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-red-500/10">
                <TrendingUp size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sales Certification</h3>
                <p className="text-sm text-gray-600">3 courses · 2 hours</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>CRM & Pipeline Management</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>Investor Relations Playbook</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Target size={12} className="text-gray-400" />
                </div>
                <span>Advanced Deal Closing</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-blue-500/10">
                <Banknote size={24} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Finance Operations</h3>
                <p className="text-sm text-gray-600">2 courses · 4 hours</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>Accounting & Financial Reporting</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock size={12} className="text-yellow-600" />
                </div>
                <span>Reconciliation & Tax Procedures</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-green-500/10">
                <ShieldCheck size={24} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Compliance & Legal</h3>
                <p className="text-sm text-gray-600">3 courses · 3.5 hours</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>Data Privacy & GDPR Compliance</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={12} className="text-green-600" />
                </div>
                <span>Legal Compliance & Due Diligence</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock size={12} className="text-yellow-600" />
                </div>
                <span>ATS Workflow Certification</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FinancePage() {
  const finance = useApi<FinanceRecord[]>("finance", "/murivest/finance");
  const crud = useCrud<Record<string, unknown>>("/murivest/finance", "finance");
  const fields: Field[] = [
    { name: "description", label: "Record" },
    { name: "category", label: "Category" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status" },
    { name: "owner", label: "Owner" },
  ];
  const totals = (finance.data ?? []).reduce(
    (acc, item) => acc + item.amount,
    0,
  );
  if (finance.isLoading) return <Loader />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Ledger total
          </p>
          <div className="mt-2 text-3xl font-semibold">
            {money.format(totals)}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            System scope
          </p>
          <div className="mt-2 text-xl font-semibold">
            Statements · Taxes · Cash · Journals
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Controls
          </p>
          <div className="mt-2 text-xl font-semibold">Reconciliations</div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Visibility
          </p>
          <div className="mt-2 text-xl font-semibold">Admin / Finance</div>
        </Card>
      </div>
      <OperatingRecordsPage module="accounting" />
      <CrudPanel
        title="New finance ledger record"
        defaults={{
          description: "",
          category: "Journal Entry",
          amount: 0,
          status: "draft",
          owner: "Finance",
        }}
        fields={fields}
        onSubmit={(input) => crud.create.mutate(input)}
      />
      <Card>
        <SectionTitle
          eyebrow="Finance"
          title="Ledger visibility, commissions and payment controls"
        />
        <EditableTable
          rows={(finance.data ?? []) as unknown as Record<string, unknown>[]}
          path="/murivest/finance"
          queryKey="finance"
          fields={fields}
          columns={[
            { key: "description", label: "Record" },
            { key: "category", label: "Category" },
            {
              key: "amount",
              label: "Amount",
              render: (v) => money.format(Number(v)),
            },
            {
              key: "status",
              label: "Status",
              render: (v) => <StatusPill value={String(v)} />,
            },
            { key: "owner", label: "Owner" },
          ]}
        />
      </Card>
    </div>
  );
}

function PortalPage({
  portal,
}: {
  portal: "investor" | "landlord" | "tenant";
}) {
  const data = useApi<PortalData>(
    `portal-${portal}`,
    `/murivest/portal/${portal}`,
  );
  if (data.isLoading) return <Loader />;
  if (data.error || !data.data)
    return (
      <ErrorState
        message={`You do not have access to the ${portal} portal, or your role has not been assigned yet.`}
      />
    );
  return (
    <div className="space-y-5">
      <Card className="bg-[#081426] text-white">
        <p className="text-[11px] uppercase tracking-[.3em] text-[#80acd8]">
          External portal
        </p>
        <h1 className="mt-2 text-4xl font-semibold capitalize">
          {portal} Portal
        </h1>
        <p className="mt-3 text-sm text-[#c6d6e8]">
          Separate screen with role-restricted records, approved documents and
          workflow visibility.
        </p>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Contacts
          </p>
          <div className="mt-2 text-3xl font-semibold">
            {data.data.contacts.length}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Properties
          </p>
          <div className="mt-2 text-3xl font-semibold">
            {data.data.properties.length}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Deals
          </p>
          <div className="mt-2 text-3xl font-semibold">
            {data.data.deals.length}
          </div>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
            Documents
          </p>
          <div className="mt-2 text-3xl font-semibold">
            {data.data.documents.length}
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle
          eyebrow="Portal data"
          title="Approved records visible to this role"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ...data.data.properties.map((item) => ({
              title: item.name,
              detail: item.location,
              status: item.status,
            })),
            ...data.data.deals.map((item) => ({
              title: item.title,
              detail: item.nextStep,
              status: item.stage,
            })),
            ...data.data.documents.map((item) => ({
              title: item.title,
              detail: item.linkedRecord,
              status: item.approvalStatus,
            })),
          ].map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4"
            >
              <h4 className="font-semibold">{item.title}</h4>
              <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
                {item.detail}
              </p>
              <div className="mt-3">
                <StatusPill value={item.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AnalyticsBIPage() {
  const center = useApi<CommandCenter>(
    "command-center",
    "/murivest/command-center",
  );
  const accounting = useApi<OperatingRecord[]>(
    "accounting",
    "/murivest/records/accounting",
  );
  const marketing = useApi<OperatingRecord[]>(
    "marketing",
    "/murivest/records/marketing",
  );
  if (center.isLoading || accounting.isLoading || marketing.isLoading)
    return <Loader />;
  const financeBars = (accounting.data ?? []).map((item) => ({
    name: item.title.slice(0, 14),
    value: item.amount ?? 0,
  }));
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          eyebrow="Analytics warehouse"
          title="BI reporting depth"
          note="Board-ready visibility across weighted AUM, approvals, accounting, marketing, legal and departmental execution."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {center.data?.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4"
            >
              <p className="text-xs uppercase tracking-[.14em] text-[#667f9a]">
                {metric.label}
              </p>
              <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
              <p className="mt-2 text-xs text-[#5d6f84]">{metric.trend}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle
            eyebrow="Accounting BI"
            title="Revenue, costs, tax and cash controls"
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeBars}>
                <CartesianGrid stroke="#e0e7ef" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => money.format(Number(v))} />
                <Bar dataKey="value" fill="#1b4b7c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionTitle
            eyebrow="Marketing BI"
            title="Campaign and attribution cards"
          />
          <div className="grid gap-3">
            {(marketing.data ?? []).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4"
              >
                <h4 className="font-semibold">{item.title}</h4>
                <p className="mt-1 text-xs text-[#5d6f84]">{item.details}</p>
                <div className="mt-2">
                  <StatusPill value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function IntegrationsPage() {
  const integrations = useApi<IntegrationStatus[]>(
    "integrations",
    "/murivest/integrations",
  );
  if (integrations.isLoading) return <Loader />;
  return (
    <Card>
      <SectionTitle
        eyebrow="Connectivity"
        title="Third-party integration readiness"
        note="Email, object storage, authentication, KYC and operational recovery controls are tracked with audit status."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {(integrations.data ?? []).map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold">{integration.service}</h4>
                <p className="mt-1 text-xs text-[#5d6f84]">
                  {integration.domain}
                </p>
              </div>
              <StatusPill value={integration.status} />
            </div>
            <p className="mt-3 text-xs leading-5">
              <span className="font-semibold">Pattern:</span>{" "}
              {integration.pattern}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#5d6f84]">
              <span className="font-semibold text-[#0b1628]">Recovery:</span>{" "}
              {integration.recoveryControl}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommandCentrePanelsPage() {
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          eyebrow="Previous command centre replicated"
          title="Excel / Apps Script panels advanced into database-backed Murivest OS modules"
          note="These panels correspond directly to the old processDailyLog, processTrafficLog, processFlagshipTask, processPipelineDeal, processCapitalPartner and processMandate workflows."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            "daily-log",
            "traffic-log",
            "flagship-tasks",
            "deals",
            "capital-partners",
            "mandates",
          ].map((slug) => (
            <Link
              key={slug}
              href={slug === "deals" ? "/deals" : `/${slug}`}
              className="rounded-xl border border-[#d8e0ea] bg-[#f8fafc] p-4 transition hover:border-[#1b4b7c]"
            >
              <h4 className="font-semibold">{slug.replaceAll("-", " ")}</h4>
              <p className="mt-2 text-xs leading-5 text-[#5d6f84]">
                Open add/edit/delete database forms and live records.
              </p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotFound() {
  return (
    <Card>
      <SectionTitle
        eyebrow="404"
        title="This Murivest OS module does not exist"
      />
      <Link
        href="/command"
        className="inline-flex items-center gap-2 rounded-xl bg-[#0b1628] px-4 py-3 text-sm text-white"
      >
        Return to command center <ArrowUpRight size={16} />
      </Link>
    </Card>
  );
}

function ProtectedApp() {
  return (
    <Shell>
      <Switch>
        <Route path="/command" component={CommandCenterPage} />
        <Route path="/command-centre" component={CommandCentrePanelsPage} />
        <Route path="/operating-model" component={OperatingModelPage} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/properties" component={PropertiesPage} />
        <Route path="/deals" component={DealsPage} />
        <Route path="/legal" component={LegalPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/finance" component={FinancePage} />
        <Route path="/accounting">
          <FinancePage />
        </Route>
        <Route path="/marketing">
          <OperatingRecordsPage module="marketing" />
        </Route>
        <Route path="/hr-academy" component={AcademyPage} />
        <Route path="/it-product">
          <OperatingRecordsPage module="it-product" />
        </Route>
        <Route path="/capital-suite">
          <OperatingRecordsPage module="capital-suite" />
        </Route>
        <Route path="/meetings-kpis">
          <OperatingRecordsPage module="meetings-kpis" />
        </Route>
        <Route path="/daily-log">
          <OperatingRecordsPage module="daily-log" />
        </Route>
        <Route path="/traffic-log">
          <OperatingRecordsPage module="traffic-log" />
        </Route>
        <Route path="/flagship-tasks">
          <OperatingRecordsPage module="flagship-tasks" />
        </Route>
        <Route path="/capital-partners">
          <OperatingRecordsPage module="capital-partners" />
        </Route>
        <Route path="/mandates">
          <OperatingRecordsPage module="mandates" />
        </Route>
        <Route path="/portals/investor">
          <PortalPage portal="investor" />
        </Route>
        <Route path="/portals/landlord">
          <PortalPage portal="landlord" />
        </Route>
        <Route path="/portals/tenant">
          <PortalPage portal="tenant" />
        </Route>
        <Route path="/analytics-bi" component={AnalyticsBIPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function ProtectedRoutes() {
  return (
    <>
      <Show when="signed-in">
        <ProtectedApp />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey)
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppRoutes />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
