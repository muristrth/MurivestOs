-- =========================================================
-- MURIVEST OS - FOUNDATION SCHEMA FOR SUPABASE + CLERK
-- =========================================================
-- Goals:
-- - Clerk handles authentication
-- - Supabase stores application data
-- - app_users stores app roles / approvals / department assignment
-- - RLS uses Clerk user id from auth.jwt()->>'sub'
-- - Super admin can access everything
-- - Other users must be approved by super admin
-- =========================================================

begin;

-- ---------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- HELPER TRIGGER FOR updated_at
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- LOOKUP / MASTER TABLES
-- ---------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_app_roles_updated_at
before update on public.app_roles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- APPLICATION USERS (linked to Clerk)
-- IMPORTANT:
-- clerk_user_id must equal auth.jwt()->>'sub'
-- ---------------------------------------------------------
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null unique,
  first_name text,
  last_name text,
  full_name text generated always as (
    trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
  ) stored,
  avatar_url text,
  phone text,

  user_type text not null default 'internal'
    check (user_type in ('internal', 'investor', 'landlord', 'tenant', 'external_legal')),

  role_slug text not null references public.app_roles(slug) on update cascade,
  department_id uuid references public.departments(id) on update cascade,
  manager_user_id uuid references public.app_users(id) on update cascade on delete set null,

  is_approved boolean not null default false,
  is_active boolean not null default true,
  can_login boolean not null default true,

  last_login_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid references public.app_users(id) on update cascade on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_clerk_user_id on public.app_users(clerk_user_id);
create index if not exists idx_app_users_role_slug on public.app_users(role_slug);
create index if not exists idx_app_users_department_id on public.app_users(department_id);
create index if not exists idx_app_users_is_approved on public.app_users(is_approved);

create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- SECURITY HELPER FUNCTIONS
-- SECURITY DEFINER lets RLS evaluate app_users safely
-- ---------------------------------------------------------
create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select auth.jwt()->>'sub';
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select au.id
  from public.app_users au
  where au.clerk_user_id = auth.jwt()->>'sub'
    and au.is_active = true
  limit 1;
$$;

create or replace function public.current_role_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select au.role_slug
  from public.app_users au
  where au.clerk_user_id = auth.jwt()->>'sub'
    and au.is_active = true
  limit 1;
$$;

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.is_active = true
      and au.can_login = true
      and au.is_approved = true
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.is_active = true
      and au.can_login = true
      and au.is_approved = true
      and au.role_slug = 'super_admin'
  );
$$;

create or replace function public.is_legal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.is_active = true
      and au.can_login = true
      and au.is_approved = true
      and au.role_slug in ('super_admin','legal_manager','legal_officer','executive_admin','ceo')
  );
$$;

create or replace function public.is_finance_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.is_active = true
      and au.can_login = true
      and au.is_approved = true
      and au.role_slug in ('super_admin','finance_manager','finance_officer','executive_admin','ceo')
  );
$$;

create or replace function public.is_manager_like()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.is_active = true
      and au.can_login = true
      and au.is_approved = true
      and au.role_slug in (
        'super_admin','ceo','executive_admin',
        'sales_director','marketing_manager','marketing_director',
        'finance_manager','legal_manager','operations_manager',
        'investor_relations_manager','hr_manager','training_manager'
      )
  );
$$;

-- ---------------------------------------------------------
-- COMPANIES / CONTACTS
-- ---------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  company_type text not null
    check (company_type in (
      'investor_firm','landlord_entity','tenant_entity','vendor','legal_firm',
      'brokerage','bank','developer','service_provider','other'
    )),
  registration_number text,
  tax_id text,
  country text,
  city text,
  address_line_1 text,
  address_line_2 text,
  notes text,
  owner_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_type on public.companies(company_type);
create index if not exists idx_companies_owner_user_id on public.companies(owner_user_id);

create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on update cascade on delete set null,

  first_name text not null,
  last_name text,
  full_name text generated always as (
    trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
  ) stored,

  contact_type text not null
    check (contact_type in (
      'investor','landlord','tenant','broker','lawyer','banker','vendor','partner','prospect','other'
    )),
  email text,
  phone text,
  whatsapp text,
  title text,

  city text,
  country text,
  relationship_owner_user_id uuid not null references public.app_users(id) on update cascade,
  lead_status text not null default 'new'
    check (lead_status in (
      'new','contacted','engaged','qualified','nurture','proposal_sent','inactive','converted','closed_lost'
    )),
  source text,
  trust_score integer check (trust_score between 0 and 100),
  engagement_score integer check (engagement_score between 0 and 100),
  access_tier text default 'internal'
    check (access_tier in ('public','internal','confidential','restricted','executive_only')),

  last_interaction_at timestamptz,
  next_follow_up_at timestamptz,

  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_type on public.contacts(contact_type);
create index if not exists idx_contacts_owner on public.contacts(relationship_owner_user_id);
create index if not exists idx_contacts_status on public.contacts(lead_status);
create index if not exists idx_contacts_next_follow_up on public.contacts(next_follow_up_at);

create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- PROPERTIES / MANDATES / INVESTORS / DEALS
-- ---------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  property_code text not null unique,
  title text not null,
  property_type text not null
    check (property_type in (
      'office','retail','mixed_use','hotel','industrial','logistics','land','residential_block','other'
    )),
  property_class text
    check (property_class in ('Grade A','Grade B','prime','core','value_add','opportunistic')),

  country text not null,
  city text not null,
  location_text text,
  latitude numeric(10,7),
  longitude numeric(10,7),

  asking_price_kes numeric(18,2),
  valuation_kes numeric(18,2),
  headline_yield numeric(8,4),
  occupancy_rate numeric(5,2),

  owner_company_id uuid references public.companies(id) on update cascade on delete set null,
  owner_contact_id uuid references public.contacts(id) on update cascade on delete set null,
  acquisition_owner_user_id uuid references public.app_users(id) on update cascade on delete set null,

  visibility_level text not null default 'internal'
    check (visibility_level in ('public','internal','confidential','restricted','executive_only')),
  publish_to_website boolean not null default false,
  publish_to_investor_portal boolean not null default false,

  status text not null default 'draft'
    check (status in ('draft','under_review','active','published','off_market','closed','archived')),

  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_type on public.properties(property_type);
create index if not exists idx_properties_class on public.properties(property_class);
create index if not exists idx_properties_city on public.properties(city);
create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_visibility on public.properties(visibility_level);

create trigger trg_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on update cascade on delete cascade,
  landlord_contact_id uuid references public.contacts(id) on update cascade on delete set null,
  landlord_company_id uuid references public.companies(id) on update cascade on delete set null,

  mandate_type text not null
    check (mandate_type in ('exclusive','open','co_broke','advisory','management')),
  status text not null default 'draft'
    check (status in (
      'draft','document_collection','legal_review','active','expiring','expired','renewed','terminated'
    )),
  start_date date,
  expiry_date date,
  exclusivity_end_date date,

  asking_price_kes numeric(18,2),
  valuation_kes numeric(18,2),
  fee_percent numeric(8,4),

  approved_for_ats boolean not null default false,
  ats_approved_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  ats_approved_at timestamptz,

  assigned_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mandates_property_id on public.mandates(property_id);
create index if not exists idx_mandates_status on public.mandates(status);
create index if not exists idx_mandates_expiry_date on public.mandates(expiry_date);

create trigger trg_mandates_updated_at
before update on public.mandates
for each row execute function public.set_updated_at();

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references public.contacts(id) on update cascade on delete cascade,

  investor_type text not null
    check (investor_type in ('individual','family_office','institution','fund','developer','corporate','other')),
  ticket_size_min_kes numeric(18,2),
  ticket_size_max_kes numeric(18,2),
  asset_class_interest text[],
  geography_preference text[],
  target_yield numeric(8,4),
  risk_profile text,
  kyc_status text not null default 'pending'
    check (kyc_status in ('pending','under_review','approved','rejected','expired')),
  nda_status text not null default 'pending'
    check (nda_status in ('pending','sent','signed','expired','waived')),
  relationship_owner_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_investors_kyc_status on public.investors(kyc_status);
create index if not exists idx_investors_nda_status on public.investors(nda_status);

create trigger trg_investors_updated_at
before update on public.investors
for each row execute function public.set_updated_at();

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_code text not null unique,
  title text not null,

  property_id uuid references public.properties(id) on update cascade on delete set null,
  investor_contact_id uuid references public.contacts(id) on update cascade on delete set null,
  investor_company_id uuid references public.companies(id) on update cascade on delete set null,

  stage text not null default 'identified'
    check (stage in (
      'identified','interest_expressed','nda','kyc','offer_submitted',
      'negotiation','due_diligence','term_sheet','legal_docs','signed',
      'closed_won','closed_lost','on_hold'
    )),
  value_kes numeric(18,2),
  close_probability numeric(5,2) check (close_probability between 0 and 100),
  expected_close_date date,
  next_step text,

  lead_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_deals_property on public.deals(property_id);
create index if not exists idx_deals_lead_user on public.deals(lead_user_id);

create trigger trg_deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- TASKS / APPROVALS / MEETINGS
-- ---------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_type text not null default 'general',
  related_entity_type text,
  related_entity_id uuid,

  department_id uuid references public.departments(id) on update cascade on delete set null,
  owner_user_id uuid not null references public.app_users(id) on update cascade,
  assigned_by_user_id uuid references public.app_users(id) on update cascade on delete set null,

  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','blocked','awaiting_review','completed','cancelled','overdue')),

  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_owner on public.tasks(owner_user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_at on public.tasks(due_at);

create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  approval_type text not null,
  status text not null default 'submitted'
    check (status in ('draft','submitted','under_review','approved','rejected','returned_for_revision')),
  requested_by_user_id uuid not null references public.app_users(id) on update cascade,
  approved_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  notes text
);

create index if not exists idx_approvals_status on public.approvals(status);
create index if not exists idx_approvals_entity on public.approvals(entity_type, entity_id);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_type text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  location text,
  owner_user_id uuid not null references public.app_users(id) on update cascade,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled','rescheduled')),
  notes text,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meetings_scheduled_at on public.meetings(scheduled_at);

create trigger trg_meetings_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- DOCUMENTS / DATA ROOMS
-- ---------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text,
  file_path text,
  mime_type text,
  entity_type text,
  entity_id uuid,
  confidentiality_level text not null default 'internal'
    check (confidentiality_level in ('public','internal','confidential','restricted','executive_only')),
  approval_status text not null default 'draft'
    check (approval_status in ('draft','submitted','approved','rejected','archived')),
  uploaded_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_files_entity on public.files(entity_type, entity_id);
create index if not exists idx_files_conf on public.files(confidentiality_level);

create trigger trg_files_updated_at
before update on public.files
for each row execute function public.set_updated_at();

create table if not exists public.data_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  property_id uuid references public.properties(id) on update cascade on delete set null,
  deal_id uuid references public.deals(id) on update cascade on delete set null,
  status text not null default 'draft'
    check (status in ('draft','active','suspended','closed')),
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_data_rooms_updated_at
before update on public.data_rooms
for each row execute function public.set_updated_at();

create table if not exists public.data_room_access (
  id uuid primary key default gen_random_uuid(),
  data_room_id uuid not null references public.data_rooms(id) on update cascade on delete cascade,
  app_user_id uuid references public.app_users(id) on update cascade on delete cascade,
  investor_id uuid references public.investors(id) on update cascade on delete cascade,
  permission_level text not null default 'view'
    check (permission_level in ('view','download')),
  access_granted_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  access_granted_at timestamptz not null default now(),
  access_expires_at timestamptz,
  unique (data_room_id, app_user_id, investor_id)
);

-- ---------------------------------------------------------
-- MARKETING
-- ---------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text not null,
  channel text not null
    check (channel in ('email','social','field','qr','event','multi_channel')),
  status text not null default 'draft'
    check (status in ('draft','in_build','awaiting_approval','approved','scheduled','launched','paused','completed','cancelled')),
  linked_property_id uuid references public.properties(id) on update cascade on delete set null,
  owner_user_id uuid references public.app_users(id) on update cascade on delete set null,
  budget_kes numeric(18,2),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_campaigns_owner on public.campaigns(owner_user_id);

create trigger trg_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  subject_template text not null,
  body_html text not null,
  approval_status text not null default 'draft'
    check (approval_status in ('draft','submitted','approved','rejected','archived')),
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on update cascade on delete set null,
  template_id uuid references public.email_templates(id) on update cascade on delete set null,
  sender_user_id uuid references public.app_users(id) on update cascade on delete set null,
  total_recipients integer not null default 0,
  total_sent integer not null default 0,
  total_delivered integer not null default 0,
  total_opened integer not null default 0,
  total_clicked integer not null default 0,
  total_replied integer not null default 0,
  total_bounced integer not null default 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- LEGAL
-- ---------------------------------------------------------
create table if not exists public.legal_matters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  matter_type text not null
    check (matter_type in (
      'deal_legal','mandate','lease','due_diligence_property','due_diligence_investor',
      'litigation','settlement','compliance','contract_review','other'
    )),
  linked_entity_type text,
  linked_entity_id uuid,
  owner_user_id uuid references public.app_users(id) on update cascade on delete set null,
  external_legal_company_id uuid references public.companies(id) on update cascade on delete set null,
  status text not null default 'open'
    check (status in ('open','under_review','awaiting_documents','pending_external_counsel','closed','on_hold')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  jurisdiction text,
  deadline_at timestamptz,
  exposure_amount_kes numeric(18,2),
  next_action text,
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_legal_matters_status on public.legal_matters(status);
create index if not exists idx_legal_matters_owner on public.legal_matters(owner_user_id);

create trigger trg_legal_matters_updated_at
before update on public.legal_matters
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- FINANCE
-- ---------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  invoice_type text not null
    check (invoice_type in ('sales','legal_vendor','vendor','tenant','other')),
  company_id uuid references public.companies(id) on update cascade on delete set null,
  contact_id uuid references public.contacts(id) on update cascade on delete set null,
  deal_id uuid references public.deals(id) on update cascade on delete set null,
  property_id uuid references public.properties(id) on update cascade on delete set null,
  legal_matter_id uuid references public.legal_matters(id) on update cascade on delete set null,
  issue_date date not null,
  due_date date not null,
  subtotal_kes numeric(18,2) not null,
  tax_kes numeric(18,2) not null default 0,
  total_kes numeric(18,2) not null,
  paid_amount_kes numeric(18,2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft','issued','partially_paid','paid','overdue','void')),
  notes text,
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  approved_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_due_date on public.invoices(due_date);

create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null,
  amount_kes numeric(18,2) not null,
  department_id uuid references public.departments(id) on update cascade on delete set null,
  company_id uuid references public.companies(id) on update cascade on delete set null,
  legal_matter_id uuid references public.legal_matters(id) on update cascade on delete set null,
  campaign_id uuid references public.campaigns(id) on update cascade on delete set null,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','approved','rejected','paid')),
  submitted_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  approved_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_status on public.expenses(status);

create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert','update','delete')),
  actor_app_user_id uuid references public.app_users(id) on update cascade on delete set null,
  actor_clerk_user_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_table on public.audit_logs(table_name);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

create or replace function public.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_app_user_id uuid;
  v_actor_clerk_user_id text;
begin
  v_actor_app_user_id := public.current_app_user_id();
  v_actor_clerk_user_id := public.current_clerk_user_id();

  if tg_op = 'INSERT' then
    insert into public.audit_logs(table_name, record_id, action, actor_app_user_id, actor_clerk_user_id, new_data)
    values (tg_table_name, new.id, 'insert', v_actor_app_user_id, v_actor_clerk_user_id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(table_name, record_id, action, actor_app_user_id, actor_clerk_user_id, old_data, new_data)
    values (tg_table_name, new.id, 'update', v_actor_app_user_id, v_actor_clerk_user_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs(table_name, record_id, action, actor_app_user_id, actor_clerk_user_id, old_data)
    values (tg_table_name, old.id, 'delete', v_actor_app_user_id, v_actor_clerk_user_id, to_jsonb(old));
    return old;
  end if;

  return null;
end;
$$;

-- attach audit triggers
create trigger trg_audit_contacts after insert or update or delete on public.contacts
for each row execute function public.audit_changes();

create trigger trg_audit_properties after insert or update or delete on public.properties
for each row execute function public.audit_changes();

create trigger trg_audit_mandates after insert or update or delete on public.mandates
for each row execute function public.audit_changes();

create trigger trg_audit_investors after insert or update or delete on public.investors
for each row execute function public.audit_changes();

create trigger trg_audit_deals after insert or update or delete on public.deals
for each row execute function public.audit_changes();

create trigger trg_audit_tasks after insert or update or delete on public.tasks
for each row execute function public.audit_changes();

create trigger trg_audit_files after insert or update or delete on public.files
for each row execute function public.audit_changes();

create trigger trg_audit_legal_matters after insert or update or delete on public.legal_matters
for each row execute function public.audit_changes();

create trigger trg_audit_invoices after insert or update or delete on public.invoices
for each row execute function public.audit_changes();

create trigger trg_audit_expenses after insert or update or delete on public.expenses
for each row execute function public.audit_changes();

-- ---------------------------------------------------------
-- SEED DEPARTMENTS
-- ---------------------------------------------------------
insert into public.departments (code, name, description)
values
  ('EXEC', 'Executive', 'Executive leadership'),
  ('SALES', 'Sales', 'CRM, sales, relationships'),
  ('INVREL', 'Investor Relations', 'Investor handling and portal'),
  ('ACQ', 'Acquisitions', 'Property onboarding and mandates'),
  ('MKT', 'Marketing', 'Campaigns, briefs, outreach'),
  ('FIN', 'Finance', 'Accounting and finance'),
  ('LEGAL', 'Legal', 'Legal and compliance'),
  ('OPS', 'Operations', 'Operations and workflows'),
  ('HR', 'HR', 'People and admin'),
  ('IT', 'IT', 'Systems and product')
on conflict (code) do nothing;

-- ---------------------------------------------------------
-- SEED ROLES
-- ---------------------------------------------------------
insert into public.app_roles (slug, name, description)
values
  ('super_admin', 'Super Admin', 'Full system access'),
  ('ceo', 'CEO', 'Executive authority'),
  ('executive_admin', 'Executive Admin', 'Executive operations authority'),
  ('sales_director', 'Sales Director', 'Sales management'),
  ('relationship_manager', 'Relationship Manager', 'Owns investor/client relationships'),
  ('acquisition_officer', 'Acquisition Officer', 'Property onboarding'),
  ('investor_relations_manager', 'Investor Relations Manager', 'Investor lifecycle management'),
  ('marketing_director', 'Marketing Director', 'Marketing leadership'),
  ('marketing_manager', 'Marketing Manager', 'Marketing operations'),
  ('finance_manager', 'Finance Manager', 'Finance approvals and reporting'),
  ('finance_officer', 'Finance Officer', 'Finance operations'),
  ('legal_manager', 'Legal Manager', 'Legal oversight'),
  ('legal_officer', 'Legal Officer', 'Legal operations'),
  ('operations_manager', 'Operations Manager', 'Ops ownership'),
  ('hr_manager', 'HR Manager', 'HR leadership'),
  ('training_manager', 'Training Manager', 'Academy and learning'),
  ('it_admin', 'IT Admin', 'System administration'),
  ('investor_portal_user', 'Investor Portal User', 'External investor user'),
  ('landlord_portal_user', 'Landlord Portal User', 'External landlord user'),
  ('tenant_portal_user', 'Tenant Portal User', 'External tenant user'),
  ('external_legal_counsel', 'External Legal Counsel', 'Outside legal firm access')
on conflict (slug) do nothing;

-- ---------------------------------------------------------
-- ENABLE RLS
-- ---------------------------------------------------------
alter table public.departments enable row level security;
alter table public.app_roles enable row level security;
alter table public.app_users enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.properties enable row level security;
alter table public.mandates enable row level security;
alter table public.investors enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.approvals enable row level security;
alter table public.meetings enable row level security;
alter table public.files enable row level security;
alter table public.data_rooms enable row level security;
alter table public.data_room_access enable row level security;
alter table public.campaigns enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_sends enable row level security;
alter table public.legal_matters enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------

-- departments / roles: approved users can read; only super admin can write
create policy "departments_read_approved"
on public.departments
for select
to authenticated
using (public.is_approved_user());

create policy "departments_manage_super_admin"
on public.departments
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "roles_read_approved"
on public.app_roles
for select
to authenticated
using (public.is_approved_user());

create policy "roles_manage_super_admin"
on public.app_roles
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- app_users
create policy "app_users_read_self_or_super_admin"
on public.app_users
for select
to authenticated
using (
  public.is_super_admin()
  or clerk_user_id = public.current_clerk_user_id()
  or (public.is_manager_like() and is_approved = true)
);

create policy "app_users_insert_super_admin_only"
on public.app_users
for insert
to authenticated
with check (public.is_super_admin());

create policy "app_users_update_super_admin_only"
on public.app_users
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- companies
create policy "companies_read_internal"
on public.companies
for select
to authenticated
using (public.is_approved_user());

create policy "companies_write_managers"
on public.companies
for all
to authenticated
using (public.is_manager_like() or public.is_super_admin())
with check (public.is_manager_like() or public.is_super_admin());

-- contacts
create policy "contacts_read_internal"
on public.contacts
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or (
    public.is_approved_user()
    and relationship_owner_user_id = public.current_app_user_id()
  )
);

create policy "contacts_insert_internal"
on public.contacts
for insert
to authenticated
with check (
  public.is_super_admin()
  or public.is_manager_like()
  or (
    public.is_approved_user()
    and relationship_owner_user_id = public.current_app_user_id()
  )
);

create policy "contacts_update_owner_or_manager"
on public.contacts
for update
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or relationship_owner_user_id = public.current_app_user_id()
)
with check (
  public.is_super_admin()
  or public.is_manager_like()
  or relationship_owner_user_id = public.current_app_user_id()
);

-- properties
create policy "properties_read_internal"
on public.properties
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or public.is_approved_user()
);

create policy "properties_write_acq_manager_super"
on public.properties
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in ('acquisition_officer','sales_director','ceo','executive_admin')
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in ('acquisition_officer','sales_director','ceo','executive_admin')
);

-- mandates
create policy "mandates_read_internal"
on public.mandates
for select
to authenticated
using (public.is_approved_user());

create policy "mandates_write_acq_legal_super"
on public.mandates
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in ('acquisition_officer','legal_manager','legal_officer','ceo','executive_admin')
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in ('acquisition_officer','legal_manager','legal_officer','ceo','executive_admin')
);

-- investors
create policy "investors_read_ir_sales"
on public.investors
for select
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','relationship_manager','sales_director',
    'ceo','executive_admin'
  )
);

create policy "investors_write_ir_manager_super"
on public.investors
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','relationship_manager','sales_director',
    'ceo','executive_admin'
  )
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','relationship_manager','sales_director',
    'ceo','executive_admin'
  )
);

-- deals
create policy "deals_read_sales_internal"
on public.deals
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or lead_user_id = public.current_app_user_id()
);

create policy "deals_write_owner_manager_super"
on public.deals
for all
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or lead_user_id = public.current_app_user_id()
)
with check (
  public.is_super_admin()
  or public.is_manager_like()
  or lead_user_id = public.current_app_user_id()
);

-- tasks
create policy "tasks_read_owner_or_manager"
on public.tasks
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or owner_user_id = public.current_app_user_id()
);

create policy "tasks_insert_internal"
on public.tasks
for insert
to authenticated
with check (
  public.is_approved_user()
  and (
    public.is_super_admin()
    or public.is_manager_like()
    or owner_user_id = public.current_app_user_id()
  )
);

create policy "tasks_update_owner_or_manager"
on public.tasks
for update
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or owner_user_id = public.current_app_user_id()
)
with check (
  public.is_super_admin()
  or public.is_manager_like()
  or owner_user_id = public.current_app_user_id()
);

-- approvals
create policy "approvals_read_internal"
on public.approvals
for select
to authenticated
using (public.is_approved_user());

create policy "approvals_write_managers"
on public.approvals
for all
to authenticated
using (public.is_manager_like() or public.is_super_admin())
with check (public.is_manager_like() or public.is_super_admin());

-- meetings
create policy "meetings_read_internal"
on public.meetings
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or owner_user_id = public.current_app_user_id()
);

create policy "meetings_write_owner_or_manager"
on public.meetings
for all
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
  or owner_user_id = public.current_app_user_id()
)
with check (
  public.is_super_admin()
  or public.is_manager_like()
  or owner_user_id = public.current_app_user_id()
);

-- files
create policy "files_read_internal_by_confidentiality"
on public.files
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_approved_user()
    and confidentiality_level in ('public','internal')
  )
  or (
    public.is_manager_like()
    and confidentiality_level in ('public','internal','confidential','restricted')
  )
  or (
    public.current_role_slug() in ('legal_manager','legal_officer')
    and confidentiality_level in ('public','internal','confidential','restricted')
  )
);

create policy "files_write_internal"
on public.files
for all
to authenticated
using (public.is_approved_user())
with check (public.is_approved_user());

-- data rooms
create policy "data_rooms_read_internal"
on public.data_rooms
for select
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in (
    'relationship_manager','investor_relations_manager','sales_director',
    'legal_manager','legal_officer','ceo','executive_admin'
  )
);

create policy "data_rooms_manage_authorized"
on public.data_rooms
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','legal_manager','legal_officer','ceo','executive_admin'
  )
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','legal_manager','legal_officer','ceo','executive_admin'
  )
);

create policy "data_room_access_read_authorized"
on public.data_room_access
for select
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','legal_manager','legal_officer','ceo','executive_admin'
  )
);

create policy "data_room_access_manage_authorized"
on public.data_room_access
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','legal_manager','legal_officer','ceo','executive_admin'
  )
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in (
    'investor_relations_manager','legal_manager','legal_officer','ceo','executive_admin'
  )
);

-- campaigns / templates / sends
create policy "campaigns_read_internal"
on public.campaigns
for select
to authenticated
using (public.is_approved_user());

create policy "campaigns_manage_marketing"
on public.campaigns
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in ('marketing_director','marketing_manager','ceo','executive_admin')
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in ('marketing_director','marketing_manager','ceo','executive_admin')
);

create policy "email_templates_read_internal"
on public.email_templates
for select
to authenticated
using (public.is_approved_user());

create policy "email_templates_manage_marketing"
on public.email_templates
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in ('marketing_director','marketing_manager','ceo','executive_admin')
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in ('marketing_director','marketing_manager','ceo','executive_admin')
);

create policy "email_sends_read_internal"
on public.email_sends
for select
to authenticated
using (public.is_approved_user());

create policy "email_sends_manage_marketing"
on public.email_sends
for all
to authenticated
using (
  public.is_super_admin()
  or public.current_role_slug() in ('marketing_director','marketing_manager','ceo','executive_admin')
)
with check (
  public.is_super_admin()
  or public.current_role_slug() in ('marketing_director','marketing_manager','ceo','executive_admin')
);

-- legal matters
create policy "legal_matters_read_authorized"
on public.legal_matters
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_legal_user()
  or owner_user_id = public.current_app_user_id()
);

create policy "legal_matters_manage_legal"
on public.legal_matters
for all
to authenticated
using (
  public.is_super_admin()
  or public.is_legal_user()
)
with check (
  public.is_super_admin()
  or public.is_legal_user()
);

-- invoices / expenses
create policy "invoices_read_finance_authorized"
on public.invoices
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_finance_user()
  or public.current_role_slug() in ('ceo','executive_admin')
);

create policy "invoices_manage_finance"
on public.invoices
for all
to authenticated
using (
  public.is_super_admin()
  or public.is_finance_user()
)
with check (
  public.is_super_admin()
  or public.is_finance_user()
);

create policy "expenses_read_finance_authorized"
on public.expenses
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_finance_user()
  or submitted_by_user_id = public.current_app_user_id()
);

create policy "expenses_insert_approved_user"
on public.expenses
for insert
to authenticated
with check (
  public.is_approved_user()
  and submitted_by_user_id = public.current_app_user_id()
);

create policy "expenses_update_finance_or_super"
on public.expenses
for update
to authenticated
using (
  public.is_super_admin()
  or public.is_finance_user()
)
with check (
  public.is_super_admin()
  or public.is_finance_user()
);

-- audit logs: super admin only
create policy "audit_logs_super_admin_only"
on public.audit_logs
for select
to authenticated
using (public.is_super_admin());

-- =========================================================
-- MURIVEST ACADEMY - COURSES, PROGRESS & CERTIFICATIONS
-- =========================================================

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  
  title text not null,
  description text,
  category text not null,
  type text not null check (type in ('video', 'pdf', 'document', 'assessment')),
  format text not null default 'online' check (format in ('online', 'live', 'hybrid')),
  
  content_url text,
  thumbnail_url text,
  duration_minutes int,
  
  order_index int not null default 0,
  
  target_audience text,
  prerequisites jsonb default '[]'::jsonb,
  learning_objectives jsonb default '[]'::jsonb,
  
  is_active boolean not null default true,
  is_published boolean not null default false,
  
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academy_courses_category on public.academy_courses(category);
create index if not exists idx_academy_courses_type on public.academy_courses(type);
create index if not exists idx_academy_courses_is_published on public.academy_courses(is_published);

create trigger trg_academy_courses_updated_at
before update on public.academy_courses
for each row execute function public.set_updated_at();

create table if not exists public.academy_learning_paths (
  id uuid primary key default gen_random_uuid(),
  
  name text not null,
  description text,
  category text not null,
  
  course_ids jsonb not null default '[]'::jsonb,
  
  target_roles text[],
  target_departments text[],
  estimated_hours numeric(5,2),
  
  is_active boolean not null default true,
  
  created_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academy_learning_paths_category on public.academy_learning_paths(category);

create trigger trg_academy_learning_paths_updated_at
before update on public.academy_learning_paths
for each row execute function public.set_updated_at();

create table if not exists public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  
  user_id uuid not null references public.app_users(id) on update cascade on delete cascade,
  course_id uuid not null references public.academy_courses(id) on update cascade on delete cascade,
  
  status text not null default 'not_started' 
    check (status in ('not_started', 'in_progress', 'completed', 'failed')),
  
  progress_percent int not null default 0,
  score int,
  
  started_at timestamptz,
  completed_at timestamptz,
  
  assigned_by_user_id uuid references public.app_users(id) on update cascade on delete set null,
  due_date timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, course_id)
);

create index if not exists idx_academy_enrollments_user_id on public.academy_enrollments(user_id);
create index if not exists idx_academy_enrollments_course_id on public.academy_enrollments(course_id);
create index if not exists idx_academy_enrollments_status on public.academy_enrollments(status);

create trigger trg_academy_enrollments_updated_at
before update on public.academy_enrollments
for each row execute function public.set_updated_at();

create table if not exists public.academy_certifications (
  id uuid primary key default gen_random_uuid(),
  
  user_id uuid not null references public.app_users(id) on update cascade on delete cascade,
  course_id uuid references public.academy_courses(id) on update cascade on delete set null,
  learning_path_id uuid references public.academy_learning_paths(id) on update cascade on delete set null,
  
  title text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  certificate_url text,
  
  is_revoked boolean not null default false,
  revoked_at timestamptz,
  revoked_reason text,
  
  created_at timestamptz not null default now()
);

create index if not exists idx_academy_certifications_user_id on public.academy_certifications(user_id);
create index if not exists idx_academy_certifications_expires on public.academy_certifications(expires_at) where expires_at is not null;

-- RLS policies for academy tables

create policy "academy_courses_read_all"
on public.academy_courses
for select
to authenticated
using (is_published = true);

create policy "academy_courses_insert_training_manager"
on public.academy_courses
for insert
to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.role_slug in ('training_manager','hr_manager','super_admin')
  )
);

create policy "academy_courses_update_training_manager"
on public.academy_courses
for update
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.role_slug in ('training_manager','hr_manager','super_admin')
  )
);

create policy "academy_courses_delete_training_manager"
on public.academy_courses
for delete
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.role_slug in ('training_manager','hr_manager','super_admin')
  )
);

create policy "academy_learning_paths_read_all"
on public.academy_learning_paths
for select
to authenticated
using (is_active = true);

create policy "academy_learning_paths_insert_training_manager"
on public.academy_learning_paths
for insert
to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.role_slug in ('training_manager','hr_manager','super_admin')
  )
);

create policy "academy_enrollments_read_own"
on public.academy_enrollments
for select
to authenticated
using (user_id = public.current_app_user_id());

create policy "academy_enrollments_read_manager"
on public.academy_enrollments
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
);

create policy "academy_enrollments_insert_all"
on public.academy_enrollments
for insert
to authenticated
with check (
  user_id = public.current_app_user_id()
  or public.is_super_admin()
  or public.is_manager_like()
);

create policy "academy_enrollments_update_own"
on public.academy_enrollments
for update
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.is_super_admin()
  or public.is_manager_like()
);

create policy "academy_certifications_read_own"
on public.academy_certifications
for select
to authenticated
using (user_id = public.current_app_user_id());

create policy "academy_certifications_read_manager"
on public.academy_certifications
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_like()
);

create policy "academy_certifications_insert_training_manager"
on public.academy_certifications
for insert
to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.app_users au
    where au.clerk_user_id = auth.jwt()->>'sub'
      and au.role_slug in ('training_manager','hr_manager','super_admin')
  )
);

commit;