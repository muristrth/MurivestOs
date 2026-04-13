-- =============================================================================
-- MURIVEST OS - REVISED DATABASE SCHEMA
-- =============================================================================
-- Production-ready schema for Murivest Realty OS
-- Auth: Clerk (handled in app layer, NOT Supabase RLS)
-- ORM: Drizzle
-- Database: Supabase PostgreSQL
-- =============================================================================
-- Design Rules:
-- - Keep murivest_* naming convention
-- - Use timestamptz for all dates
-- - Add proper foreign keys
-- - Add audit logging
-- - Approval state in DB (additional control layer)
-- - Keep Clerk as auth source
-- =============================================================================

begin;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- updated_at trigger function
create or replace function murivest_internal.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- make UUID from text (for compatibility)
create or replace function murivest_internal.uuid_or_text(v text)
returns uuid
language plpgsql
as $$
begin
  return case when v ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then uuid_or_text(v)::uuid
    else uuid_generate_v5('11111111-1111-1111-1111-111111111111'::uuid, v)::uuid
  end;
exception when invalid_text_representation then
  return uuid_generate_v5('11111111-1111-1111-1111-111111111111'::uuid, v);
end;
$$;

-- Create schema for internal functions
create schema if not exists murivest_internal;

-- =============================================================================
-- CORE TABLES - USERS & ROLES
-- =============================================================================

-- User roles lookup
create table murivest_roles (
    id uuid primary key default uuid_generate_v4(),
    slug text not null unique,
    name text not null unique,
    description text,
    permissions jsonb not null default '[]'::jsonb,
    is_system boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_roles_slug on murivest_roles(slug);
create trigger trg_roles_updated_at before update on murivest_roles
    for each row execute function murivest_internal.set_updated_at();

-- Departments lookup
create table murivest_departments (
    id uuid primary key default uuid_generate_v4(),
    code text not null unique,
    name text not null unique,
    description text,
    parent_department_id uuid references murivest_departments(id) on delete set null,
    head_user_id uuid,
    cost_center text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_departments_code on murivest_departments(code);
create index idx_departments_parent on murivest_departments(parent_department_id);
create trigger trg_departments_updated_at before update on murivest_departments
    for each row execute function murivest_internal.set_updated_at();

-- Users table (synced from Clerk via webhook - Clerk handles auth)
create table murivest_users (
    id text primary key,  -- Keep text for Clerk ID compatibility: user_xxxxx
    clerk_user_id text unique,
    email text not null unique,
    first_name text,
    last_name text,
    full_name text generated always as (
        trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    ) stored,
    avatar_url text,
    phone text,
    
    -- Role and department from Clerk claims (can be overridden by super admin)
    role_slug text references murivest_roles(slug) on update cascade,
    department_code text references murivest_departments(code) on update cascade,
    
    -- Approval state in DATABASE (additional control layer)
    is_approved boolean not null default false,
    approved_at timestamptz,
    approved_by_user_id text,
    
    -- Account state
    is_active boolean not null default true,
    status text not null default 'active'
        check (status in ('active', 'suspended', 'deactivated')),
    
    -- Login tracking
    last_login_at timestamptz,
    login_count integer not null default 0,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_users_clerk on murivest_users(clerk_user_id);
create index idx_users_email on murivest_users(email);
create index idx_users_role on murivest_users(role_slug);
create index idx_users_department on murivest_users(department_code);
create index idx_users_approved on murivest_users(is_approved);
create trigger trg_users_updated_at before update on murivest_users
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- COMPANIES & CONTACTS
-- =============================================================================

create table murivest_companies (
    id text primary key,
    name text not null,
    display_name text,
    type text not null
        check (type in (
            'investor_firm', 'landlord', 'tenant', 'vendor', 'legal_firm',
            'brokerage', 'bank', 'developer', 'service_provider', 'other'
        )),
    registration_number text,
    tax_id text,
    country text,
    city text,
    address_line_1 text,
    address_line_2 text,
    notes text,
    
    -- Ownership
    owner_user_id text references murivest_users(id) on delete set null,
    created_by_user_id text references murivest_users(id) on delete set null,
    
    -- Status
    is_active boolean not null default true,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_companies_type on murivest_companies(type);
create index idx_companies_owner on murivest_companies(owner_user_id);
create trigger trg_companies_updated_at before update on murivest_companies
    for each row execute function murivest_internal.set_updated_at();

create table murivest_contacts (
    id text primary key,
    company_id text references murivest_companies(id) on delete set null,
    
    first_name text not null,
    last_name text,
    full_name text generated always as (
        trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    ) stored,
    
    category text not null
        check (category in (
            'investor', 'landlord', 'tenant', 'broker', 'lawyer', 
            'banker', 'vendor', 'partner', 'prospect', 'other'
        )),
    email text,
    phone text,
    whatsapp text,
    title text,
    
    city text,
    country text,
    
    -- Ownership
    relationship_owner_user_id text not null references murivest_users(id),
    
    -- CRM fields
    status text not null default 'new'
        check (status in (
            'new', 'contacted', 'engaged', 'qualified', 'nurture', 
            'proposal_sent', 'inactive', 'converted', 'closed_lost'
        )),
    source text,
    trust_score integer check (trust_score between 0 and 100),
    engagement_score integer check (engagement_score between 0 and 100),
    access_tier text default 'internal'
        check (access_tier in ('public', 'internal', 'confidential', 'restricted', 'executive_only')),
    
    -- Tracking
    last_interaction_at timestamptz,
    next_follow_up_at timestamptz,
    created_by_user_id text references murivest_users(id) on delete set null,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_contacts_category on murivest_contacts(category);
create index idx_contacts_owner on murivest_contacts(relationship_owner_user_id);
create index idx_contacts_status on murivest_contacts(status);
create index idx_contacts_company on murivest_contacts(company_id);
create index idx_contacts_next_follow on murivest_contacts(next_follow_up_at);
create trigger trg_contacts_updated_at before update on murivest_contacts
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- PROPERTIES & MANDATES
-- =============================================================================

create table murivest_properties (
    id text primary key,
    property_code text unique,
    title text not null,
    property_type text not null
        check (property_type in (
            'office', 'retail', 'mixed_use', 'hotel', 'industrial', 
            'logistics', 'land', 'residential_block', 'other'
        )),
    property_class text
        check (property_class in ('Grade A', 'Grade B', 'prime', 'core', 'value_add', 'opportunistic')),
    
    country text not null,
    city text not null,
    location_text text,
    latitude numeric(10, 7),
    longitude numeric(10, 7),
    
    asking_price_kes numeric(18, 2),
    valuation_kes numeric(18, 2),
    headline_yield numeric(8, 4),
    occupancy_rate numeric(5, 2),
    
    -- Ownership
    owner_company_id text references murivest_companies(id) on delete set null,
    owner_contact_id text references murivest_contacts(id) on delete set null,
    acquisition_owner_user_id text references murivest_users(id) on delete set null,
    
    -- Visibility
    visibility_level text not null default 'internal'
        check (visibility_level in ('public', 'internal', 'confidential', 'restricted', 'executive_only')),
    publish_to_website boolean not null default false,
    publish_to_investor_portal boolean not null default false,
    
    -- Status
    status text not null default 'draft'
        check (status in ('draft', 'under_review', 'active', 'published', 'off_market', 'closed', 'archived')),
    
    -- Tracking
    created_by_user_id text references murivest_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_properties_type on murivest_properties(property_type);
create index idx_properties_class on murivest_properties(property_class);
create index idx_properties_city on murivest_properties(city);
create index idx_properties_status on murivest_properties(status);
create index idx_properties_visibility on murivest_properties(visibility_level);
create trigger trg_properties_updated_at before update on murivest_properties
    for each row execute function murivest_internal.set_updated_at();

create table murivest_mandates (
    id text primary key,
    property_id text not null references murivest_properties(id) on delete cascade,
    landlord_contact_id text references murivest_contacts(id) on delete set null,
    landlord_company_id text references murivest_companies(id) on delete set null,
    
    mandate_type text not null
        check (mandate_type in ('exclusive', 'open', 'co_broke', 'advisory', 'management')),
    status text not null default 'draft'
        check (status in (
            'draft', 'document_collection', 'legal_review', 'active', 
            'expiring', 'expired', 'renewed', 'terminated'
        )),
    start_date date,
    expiry_date date,
    exclusivity_end_date date,
    
    asking_price_kes numeric(18, 2),
    valuation_kes numeric(18, 2),
    fee_percent numeric(8, 4),
    
    approved_for_ats boolean not null default false,
    ats_approved_by_user_id text references murivest_users(id) on delete set null,
    ats_approved_at timestamptz,
    
    assigned_user_id text references murivest_users(id) on delete set null,
    created_by_user_id text references murivest_users(id) on delete set null,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_mandates_property on murivest_mandates(property_id);
create index idx_mandates_status on murivest_mandates(status);
create index idx_mandates_expiry on murivest_mandates(expiry_date);
create trigger trg_mandates_updated_at before update on murivest_mandates
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- INVESTORS
-- =============================================================================

create table murivest_investors (
    id text primary key,
    contact_id text not null unique references murivest_contacts(id) on delete cascade,
    
    investor_type text not null
        check (investor_type in (
            'individual', 'family_office', 'institution', 'fund', 
            'developer', 'corporate', 'other'
        )),
    ticket_size_min_kes numeric(18, 2),
    ticket_size_max_kes numeric(18, 2),
    asset_class_interest text[],
    geography_preference text[],
    target_yield numeric(8, 4),
    risk_profile text,
    
    kyc_status text not null default 'pending'
        check (kyc_status in ('pending', 'under_review', 'approved', 'rejected', 'expired')),
    nda_status text not null default 'pending'
        check (nda_status in ('pending', 'sent', 'signed', 'expired', 'waived')),
    
    relationship_owner_user_id text references murivest_users(id) on delete set null,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_investors_kyc on murivest_investors(kyc_status);
create index idx_investors_nda on murivest_investors(nda_status);
create index idx_investors_owner on murivest_investors(relationship_owner_user_id);
create trigger trg_investors_updated_at before update on murivest_investors
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- DEALS
-- =============================================================================

create table murivest_deals (
    id text primary key,
    deal_code text unique,
    title text not null,
    
    property_id text references murivest_properties(id) on delete set null,
    investor_contact_id text references murivest_contacts(id) on delete set null,
    investor_company_id text references murivest_companies(id) on delete set null,
    
    stage text not null default 'identified'
        check (stage in (
            'identified', 'interest_expressed', 'nda', 'kyc', 'offer_submitted',
            'negotiation', 'due_diligence', 'term_sheet', 'legal_docs', 'signed',
            'closed_won', 'closed_lost', 'on_hold'
        )),
    value_kes numeric(18, 2),
    close_probability numeric(5, 2) check (close_probability between 0 and 100),
    expected_close_date date,
    next_step text,
    
    lead_user_id text references murivest_users(id) on delete set null,
    created_by_user_id text references murivest_users(id) on delete set null,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_deals_stage on murivest_deals(stage);
create index idx_deals_property on murivest_deals(property_id);
create index idx_deals_lead on murivest_deals(lead_user_id);
create trigger trg_deals_updated_at before update on murivest_deals
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- TASKS & WORKFLOWS
-- =============================================================================

create table murivest_tasks (
    id text primary key,
    title text not null,
    description text,
    task_type text not null default 'general',
    related_entity_type text,
    related_entity_id text,
    
    department_code text references murivest_departments(code) on delete set null,
    owner_user_id text not null references murivest_users(id),
    assigned_by_user_id text references murivest_users(id) on delete set null,
    assigned_to_user_id text references murivest_users(id) on delete set null,
    
    priority text not null default 'medium'
        check (priority in ('low', 'medium', 'high', 'critical')),
    status text not null default 'not_started'
        check (status in (
            'not_started', 'in_progress', 'blocked', 'awaiting_review', 
            'completed', 'cancelled', 'overdue'
        )),
    
    due_at timestamptz,
    completed_at timestamptz,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_tasks_owner on murivest_tasks(owner_user_id);
create index idx_tasks_status on murivest_tasks(status);
create index idx_tasks_due on murivest_tasks(due_at);
create index idx_tasks_department on murivest_tasks(department_code);
create trigger trg_tasks_updated_at before update on murivest_tasks
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- APPROVALS
-- =============================================================================

create table murivest_approvals (
    id text primary key,
    entity_type text not null,
    entity_id text not null,
    approval_type text not null,
    
    status text not null default 'submitted'
        check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'returned_for_revision')),
    
    requested_by_user_id text not null references murivest_users(id),
    approved_by_user_id text references murivest_users(id) on delete set null,
    
    requested_at timestamptz not null default now(),
    decided_at timestamptz,
    
    notes text,
    decision_notes text
);

create index idx_approvals_status on murivest_approvals(status);
create index idx_approvals_entity on murivest_approvals(entity_type, entity_id);

-- =============================================================================
-- MEETINGS
-- =============================================================================

create table murivest_meetings (
    id text primary key,
    title text not null,
    meeting_type text not null,
    scheduled_at timestamptz not null,
    duration_minutes integer not null check (duration_minutes > 0),
    location text,
    
    owner_user_id text not null references murivest_users(id),
    status text not null default 'scheduled'
        check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    
    attendees jsonb not null default '[]'::jsonb,
    notes text,
    action_items jsonb not null default '[]'::jsonb,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_meetings_scheduled on murivest_meetings(scheduled_at);
create index idx_meetings_owner on murivest_meetings(owner_user_id);
create trigger trg_meetings_updated_at before update on murivest_meetings
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- DOCUMENTS & FILES
-- =============================================================================

create table murivest_documents (
    id text primary key,
    title text not null,
    file_name text,
    file_path text,
    mime_type text,
    
    entity_type text,
    entity_id text,
    
    confidentiality_level text not null default 'internal'
        check (confidentiality_level in ('public', 'internal', 'confidential', 'restricted', 'executive_only')),
    approval_status text not null default 'draft'
        check (approval_status in ('draft', 'submitted', 'approved', 'rejected', 'archived')),
    
    uploaded_by_user_id text references murivest_users(id) on delete set null,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_documents_entity on murivest_documents(entity_type, entity_id);
create index idx_documents_confidentiality on murivest_documents(confidentiality_level);
create trigger trg_documents_updated_at before update on murivest_documents
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- DATA ROOMS
-- =============================================================================

create table murivest_data_rooms (
    id text primary key,
    title text not null,
    property_id text references murivest_properties(id) on delete set null,
    deal_id text references murivest_deals(id) on delete set null,
    
    status text not null default 'draft'
        check (status in ('draft', 'active', 'suspended', 'closed')),
    
    created_by_user_id text references murivest_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table murivest_data_room_access (
    id text primary key,
    data_room_id text not null references murivest_data_rooms(id) on delete cascade,
    investor_id text references murivest_investors(id) on delete cascade,
    permission_level text not null default 'view'
        check (permission_level in ('view', 'download')),
    access_granted_by_user_id text references murivest_users(id) on delete set null,
    access_granted_at timestamptz not null default now(),
    access_expires_at timestamptz,
    unique(data_room_id, investor_id)
);

create trigger trg_data_rooms_updated_at before update on murivest_data_rooms
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- LEGAL MATTERS
-- =============================================================================

create table murivest_legal_matters (
    id text primary key,
    title text not null,
    matter_type text not null
        check (matter_type in (
            'deal_legal', 'mandate', 'lease', 'due_diligence_property', 'due_diligence_investor',
            'litigation', 'settlement', 'compliance', 'contract_review', 'other'
        )),
    linked_entity_type text,
    linked_entity_id text,
    
    owner_user_id text references murivest_users(id) on delete set null,
    external_legal_company_id text references murivest_companies(id) on delete set null,
    
    status text not null default 'open'
        check (status in ('open', 'under_review', 'awaiting_documents', 'pending_external_counsel', 'closed', 'on_hold')),
    priority text not null default 'medium'
        check (priority in ('low', 'medium', 'high', 'critical')),
    
    jurisdiction text,
    deadline_at timestamptz,
    exposure_amount_kes numeric(18, 2),
    next_action text,
    
    created_by_user_id text references murivest_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_legal_matters_status on murivest_legal_matters(status);
create index idx_legal_matters_owner on murivest_legal_matters(owner_user_id);
create index idx_legal_matters_type on murivest_legal_matters(matter_type);
create trigger trg_legal_matters_updated_at before update on murivest_legal_matters
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- LEASES (for tenant portal)
-- =============================================================================

create table murivest_leases (
    id text primary key,
    property_id text not null references murivest_properties(id),
    tenant_contact_id text not null references murivest_contacts(id),
    tenant_company_id text references murivest_companies(id),
    
    lease_type text not null default 'commercial'
        check (lease_type in ('commercial', 'residential', 'mixed')),
    status text not null default 'draft'
        check (status in ('draft', 'negotiation', 'active', 'renewal', 'expired', 'terminated')),
    
    start_date date not null,
    end_date date not null,
    rent_amount_kes numeric(18, 2) not null,
    deposit_amount_kes numeric(18, 2),
    
    rent_escalation_percent numeric(5, 2),
    payment_terms text,
    
    created_by_user_id text references murivest_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_leases_property on murivest_leases(property_id);
create index idx_leases_tenant on murivest_leases(tenant_contact_id);
create index idx_leases_status on murivest_leases(status);
create trigger trg_leases_updated_at before update on murivest_leases
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- FINANCE - INVOICES
-- =============================================================================

create table murivest_invoices (
    id text primary key,
    invoice_number text not null unique,
    invoice_type text not null
        check (invoice_type in ('sales', 'legal_vendor', 'vendor', 'tenant', 'other')),
    
    company_id text references murivest_companies(id) on delete set null,
    contact_id text references murivest_contacts(id) on delete set null,
    deal_id text references murivest_deals(id) on delete set null,
    property_id text references murivest_properties(id) on delete set null,
    legal_matter_id text references murivest_legal_matters(id) on delete set null,
    
    issue_date date not null,
    due_date date not null,
    subtotal_kes numeric(18, 2) not null,
    tax_kes numeric(18, 2) not null default 0,
    total_kes numeric(18, 2) not null,
    paid_amount_kes numeric(18, 2) not null default 0,
    
    status text not null default 'draft'
        check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
    
    notes text,
    approved_by_user_id text references murivest_users(id) on delete set null,
    created_by_user_id text references murivest_users(id) on delete set null,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_invoices_status on murivest_invoices(status);
create index idx_invoices_due_date on murivest_invoices(due_date);
create index idx_invoices_contact on murivest_invoices(contact_id);
create trigger trg_invoices_updated_at before update on murivest_invoices
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- FINANCE - EXPENSES
-- =============================================================================

create table murivest_expenses (
    id text primary key,
    description text not null,
    category text not null,
    amount_kes numeric(18, 2) not null,
    
    department_code text references murivest_departments(code) on delete set null,
    company_id text references murivest_companies(id) on delete set null,
    legal_matter_id text references murivest_legal_matters(id) on delete set null,
    
    status text not null default 'submitted'
        check (status in ('submitted', 'under_review', 'approved', 'rejected', 'paid')),
    
    submitted_by_user_id text references murivest_users(id) on delete set null,
    approved_by_user_id text references murivest_users(id) on delete set null,
    expense_date date not null default current_date,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_expenses_status on murivest_expenses(status);
create index idx_expenses_category on murivest_expenses(category);
create index idx_expenses_submitted_by on murivest_expenses(submitted_by_user_id);
create trigger trg_expenses_updated_at before update on murivest_expenses
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- FINANCE - BANK ACCOUNTS
-- =============================================================================

create table murivest_bank_accounts (
    id text primary key,
    account_name text not null,
    account_number text not null,
    bank_name text not null,
    account_type text not null
        check (account_type in ('checking', 'savings', 'investment', 'escrow')),
    current_balance_kes numeric(18, 2) not null default 0,
    currency text not null default 'KES',
    status text not null default 'active'
        check (status in ('active', 'inactive', 'closed')),
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger trg_bank_accounts_updated_at before update on murivest_bank_accounts
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- MARKETING - CAMPAIGNS
-- =============================================================================

create table murivest_campaigns (
    id text primary key,
    name text not null,
    campaign_type text not null,
    channel text not null
        check (channel in ('email', 'social', 'field', 'qr', 'event', 'multi_channel')),
    status text not null default 'draft'
        check (status in (
            'draft', 'in_build', 'awaiting_approval', 'approved', 
            'scheduled', 'launched', 'paused', 'completed', 'cancelled'
        )),
    
    linked_property_id text references murivest_properties(id) on delete set null,
    owner_user_id text references murivest_users(id) on delete set null,
    
    budget_kes numeric(18, 2),
    start_date date,
    end_date date,
    
    leads_generated integer,
    spend_kes numeric(18, 2),
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_campaigns_status on murivest_campaigns(status);
create index idx_campaigns_owner on murivest_campaigns(owner_user_id);
create trigger trg_campaigns_updated_at before update on murivest_campaigns
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- MARKETING - EMAIL TEMPLATES
-- =============================================================================

create table murivest_email_templates (
    id text primary key,
    name text not null,
    category text not null,
    subject_template text not null,
    body_html text not null,
    
    approval_status text not null default 'draft'
        check (approval_status in ('draft', 'submitted', 'approved', 'rejected', 'archived')),
    
    created_by_user_id text references murivest_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger trg_email_templates_updated_at before update on murivest_email_templates
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- MARKETING - EMAIL SENDS
-- =============================================================================

create table murivest_email_sends (
    id text primary key,
    campaign_id text references murivest_campaigns(id) on delete set null,
    template_id text references murivest_email_templates(id) on delete set null,
    sender_user_id text references murivest_users(id) on delete set null,
    
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

-- =============================================================================
-- TRAINING - MURIVEST ACADEMY
-- =============================================================================

create table murivest_training (
    id text primary key,
    title text not null,
    category text not null,
    type text not null
        check (type in ('course', 'playbook', 'guide', 'video', 'quiz')),
    department_code text references murivest_departments(code) on delete set null,
    
    status text not null default 'active'
        check (status in ('draft', 'active', 'archived')),
    content_url text,
    duration_minutes integer,
    quiz_required boolean not null default false,
    assigned_roles text[],
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table murivest_employee_progress (
    id text primary key,
    user_id text not null references murivest_users(id),
    training_id text not null references murivest_training(id),
    
    status text not null default 'assigned'
        check (status in ('assigned', 'in_progress', 'completed', 'failed')),
    progress_percent integer not null default 0,
    quiz_score integer,
    completed_at timestamptz,
    assigned_at timestamptz not null default now(),
    
    unique(user_id, training_id)
);

-- =============================================================================
-- IT - RELEASES & FEATURES
-- =============================================================================

create table murivest_sprints (
    id text primary key,
    sprint_name text not null,
    sprint_number integer not null,
    start_date date not null,
    end_date date not null,
    goal text,
    status text not null default 'planning'
        check (status in ('planning', 'active', 'completed', 'cancelled')),
    total_points integer,
    completed_points integer,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table murivest_features (
    id text primary key,
    feature_title text not null,
    description text,
    feature_type text not null
        check (feature_type in ('feature', 'enhancement', 'bug_fix', 'refactor')),
    priority text not null default 'medium'
        check (priority in ('low', 'medium', 'high', 'critical')),
    status text not null default 'backlog'
        check (status in ('backlog', 'planned', 'in_progress', 'completed', 'cancelled')),
    requested_by text,
    assigned_to text,
    estimated_effort integer,
    target_release text,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table murivest_bugs (
    id text primary key,
    bug_number text unique,
    title text not null,
    description text,
    steps_to_reproduce text,
    expected_behavior text,
    actual_behavior text,
    severity text not null default 'medium'
        check (severity in ('low', 'medium', 'high', 'critical')),
    priority text not null default 'medium'
        check (priority in ('low', 'medium', 'high', 'critical')),
    status text not null default 'open'
        check (status in ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
    reported_by text,
    assigned_to text,
    module text,
    environment text,
    resolved_at timestamptz,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table murivest_releases (
    id text primary key,
    version text not null,
    release_name text not null,
    release_type text not null
        check (release_type in ('major', 'minor', 'patch', 'hotfix')),
    status text not null default 'planned'
        check (status in ('planned', 'in_progress', 'released', 'cancelled')),
    planned_date date,
    actual_date date,
    release_notes text,
    approved_by text,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

create table murivest_notifications (
    id text primary key,
    recipient_user_id text not null references murivest_users(id),
    subject text not null,
    message text not null,
    module text not null,
    
    status text not null default 'pending'
        check (status in ('pending', 'sent', 'read', 'failed')),
    provider_response text,
    
    created_at timestamptz not null default now()
);

create index idx_notifications_recipient on murivest_notifications(recipient_user_id);
create index idx_notifications_status on murivest_notifications(status);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

create table murivest_audit_logs (
    id bigint generated always as identity primary key,
    table_name text not null,
    record_id text,
    action text not null check (action in ('insert', 'update', 'delete')),
    
    actor_user_id text references murivest_users(id) on delete set null,
    old_data jsonb,
    new_data jsonb,
    
    ip_address text,
    user_agent text,
    
    created_at timestamptz not null default now()
);

create index idx_audit_logs_table on murivest_audit_logs(table_name);
create index idx_audit_logs_record on murivest_audit_logs(record_id);
create index idx_audit_logs_created on murivest_audit_logs(created_at desc);
create index idx_audit_logs_actor on murivest_audit_logs(actor_user_id);

-- =============================================================================
-- ACTIVITY / HISTORY
-- =============================================================================

create table murivest_activity (
    id text primary key,
    timestamp timestamptz not null default now(),
    actor_user_id text references murivest_users(id) on delete set null,
    action text not null,
    module text not null,
    entity_type text,
    entity_id text,
    impact text,
    details text,
    
    created_at timestamptz not null default now()
);

create index idx_activity_timestamp on murivest_activity(timestamp desc);
create index idx_activity_module on murivest_activity(module);
create index idx_activity_actor on murivest_activity(actor_user_id);

-- =============================================================================
-- INTEGRATIONS
-- =============================================================================

create table murivest_integrations (
    id text primary key,
    name text not null,
    provider text not null,
    type text not null,
    status text not null default 'inactive'
        check (status in ('active', 'inactive', 'error')),
    config jsonb,
    last_sync_at timestamptz,
    health_status text not null default 'unknown'
        check (health_status in ('healthy', 'degraded', 'error', 'unknown')),
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger trg_integrations_updated_at before update on murivest_integrations
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- CONTENT CALENDAR
-- =============================================================================

create table murivest_content_calendar (
    id text primary key,
    title text not null,
    content_type text not null,
    channel text not null,
    scheduled_date timestamptz not null,
    status text not null default 'draft'
        check (status in ('draft', 'scheduled', 'published', 'cancelled')),
    content text,
    campaign_id text references murivest_campaigns(id) on delete set null,
    assigned_to_user_id text references murivest_users(id),
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =============================================================================
-- OPERATING RECORDS (generic module storage)
-- =============================================================================

create table murivest_operating_records (
    id text primary key,
    module text not null,
    title text not null,
    category text not null,
    status text not null,
    owner_user_id text not null references murivest_users(id),
    related_party text,
    amount_kes numeric(18, 2),
    
    date date not null,
    due_date date,
    priority text,
    details text not null,
    metadata jsonb not null default '{}'::jsonb,
    
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_operating_module on murivest_operating_records(module);
create index idx_operating_status on murivest_operating_records(status);
create index idx_operating_owner on murivest_operating_records(owner_user_id);
create trigger trg_operating_updated_at before update on murivest_operating_records
    for each row execute function murivest_internal.set_updated_at();

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Seed roles
insert into murivest_roles (slug, name, description, is_system) values
    ('super_admin', 'Super Admin', 'Full system access', true),
    ('ceo', 'CEO', 'Executive authority', true),
    ('executive_admin', 'Executive Admin', 'Executive operations', true),
    ('sales_director', 'Sales Director', 'Sales management', true),
    ('relationship_manager', 'Relationship Manager', 'Investor/client relationships', true),
    ('acquisition_officer', 'Acquisition Officer', 'Property onboarding', true),
    ('investor_relations_manager', 'Investor Relations Manager', 'Investor lifecycle', true),
    ('marketing_director', 'Marketing Director', 'Marketing leadership', true),
    ('marketing_manager', 'Marketing Manager', 'Marketing operations', true),
    ('finance_manager', 'Finance Manager', 'Finance approvals', true),
    ('finance_officer', 'Finance Officer', 'Finance operations', true),
    ('legal_manager', 'Legal Manager', 'Legal oversight', true),
    ('legal_officer', 'Legal Officer', 'Legal operations', true),
    ('operations_manager', 'Operations Manager', 'Ops ownership', true),
    ('hr_manager', 'HR Manager', 'HR leadership', true),
    ('internal_team', 'Internal Team', 'General staff access', true),
    ('investor_portal', 'Investor Portal User', 'External investor', false),
    ('landlord_portal', 'Landlord Portal User', 'External landlord', false),
    ('tenant_portal', 'Tenant Portal User', 'External tenant', false)
on conflict (slug) do nothing;

-- Seed departments
insert into murivest_departments (code, name, description) values
    ('EXEC', 'Executive', 'Executive leadership'),
    ('SALES', 'Sales', 'CRM and sales'),
    ('INVREL', 'Investor Relations', 'Investor handling'),
    ('ACQ', 'Acquisitions', 'Property onboarding'),
    ('MKT', 'Marketing', 'Campaigns and outreach'),
    ('FIN', 'Finance', 'Accounting and finance'),
    ('LEGAL', 'Legal', 'Legal and compliance'),
    ('OPS', 'Operations', 'Operations and workflows'),
    ('HR', 'HR', 'People and admin'),
    ('IT', 'IT', 'Systems and product')
on conflict (code) do nothing;

commit;