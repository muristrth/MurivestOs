-- =========================================================
-- MURIVEST ACADEMY - INITIAL COURSE SEED DATA
-- Run this SQL to populate initial academy courses
-- IMPORTANT: Run the schema (from revised_supabase_schema.sql) first
-- =========================================================

INSERT INTO public.academy_courses (
  title,
  description,
  category,
  type,
  format,
  content_url,
  thumbnail_url,
  duration_minutes,
  order_index,
  target_audience,
  prerequisites,
  learning_objectives,
  is_active,
  is_published
) VALUES 
-- Executive courses
(
  'Executive Capital Suite - Introduction',
  'Overview of the capital management system, board operations and investment governance.',
  'Executive',
  'video',
  'online',
  NULL,
  NULL,
  45,
  1,
  'Executive Team',
  '[]'::jsonb,
  '["Understand capital structure", "Board governance protocols"]'::jsonb,
  true,
  true
),
(
  'Capital Manual & Board Protocols',
  'Complete guide to capital partner engagement, mandate structures, and board procedures.',
  'Executive',
  'pdf',
  'online',
  '/docs/Murivest Documentation/19_Executive_Capital_Suite_Documentation.docx',
  NULL,
  120,
  2,
  'Executive Team',
  '[]'::jsonb,
  '["Mandate structures", "Board voting procedures"]'::jsonb,
  true,
  true
),
(
  'Analytics & BI Dashboard Training',
  'Using weighted AUM, pipeline velocity, and KPI reports for decision making.',
  'Executive',
  'video',
  'online',
  NULL,
  NULL,
  45,
  3,
  'Executive, Finance',
  '[]'::jsonb,
  '["Weighted AUM calculations", "Pipeline velocity metrics"]'::jsonb,
  true,
  true
),

-- Sales courses
(
  'CRM & Pipeline Management',
  'Using the Murivest CRM to track leads, deals, and investor preferences.',
  'Sales',
  'video',
  'online',
  NULL,
  NULL,
  40,
  10,
  'Sales Team',
  '[]'::jsonb,
  '["Lead tracking", "Deal pipeline management"]'::jsonb,
  true,
  true
),
(
  'Investor Relations Playbook',
  'Best practices for investor communication, presentations, and relationship management.',
  'Sales',
  'pdf',
  'online',
  '/docs/Murivest Documentation/12_User_Manual_Investor_Relations.docx',
  NULL,
  90,
  11,
  'Sales, Investor Relations',
  '[]'::jsonb,
  '["Investor communication", "Pitch deck creation"]'::jsonb,
  true,
  true
),
(
  'Authority-to-Sell (ATS) Workflow',
  'Step-by-step process for creating, approving, and publishing mandates.',
  'Legal',
  'video',
  'online',
  NULL,
  NULL,
  30,
  20,
  'Legal, Sales, Operations',
  '[]'::jsonb,
  '["ATS creation", "Approval workflow"]'::jsonb,
  true,
  true
),

-- Finance courses
(
  'Accounting & Financial Reporting',
  'Understanding statements, reconciliations, taxes, and journal entries.',
  'Finance',
  'pdf',
  'online',
  '/docs/Murivest Documentation/14_User_Manual_Finance.docx',
  NULL,
  180,
  30,
  'Finance Team',
  '[]'::jsonb,
  '["Financial statements", "Reconciliation"]'::jsonb,
  true,
  true
),

-- Operations courses
(
  'Property Management Essentials',
  'Managing landlord relationships, mandates, occupancy, and lease workflows.',
  'Operations',
  'video',
  'online',
  NULL,
  NULL,
  35,
  40,
  'Operations Team',
  '[]'::jsonb,
  '["Landlord relations", "Mandate management"]'::jsonb,
  true,
  true
),
(
  'Investor Portal Training',
  'How to configure and manage investor portal access and documents.',
  'Operations',
  'video',
  'online',
  NULL,
  NULL,
  30,
  41,
  'Operations, Admin',
  '[]'::jsonb,
  '["Portal configuration", "Document sharing"]'::jsonb,
  true,
  true
),
(
  'Landlord Portal Operations',
  'Managing landlord relationships, mandates, and inquiries.',
  'Operations',
  'video',
  'online',
  NULL,
  NULL,
  25,
  42,
  'Operations',
  '[]'::jsonb,
  '["Mandate tracking", "Landlord communications"]'::jsonb,
  true,
  true
),
(
  'Tenant Portal Management',
  'Lease management, service requests, and tenant communication.',
  'Operations',
  'video',
  'online',
  NULL,
  NULL,
  20,
  43,
  'Operations',
  '[]'::jsonb,
  '["Service requests", "Lease management"]'::jsonb,
  true,
  true
),

-- Legal courses
(
  'Legal Compliance & Due Diligence',
  'Legal matter management, dispute handling, and compliance requirements.',
  'Legal',
  'pdf',
  'online',
  '/docs/Murivest Documentation/28_Legal_Compliance_Module_Specification.docx',
  NULL,
  150,
  50,
  'Legal Team',
  '[]'::jsonb,
  '["Due diligence", "Compliance requirements"]'::jsonb,
  true,
  true
),

-- Marketing courses
(
  'Marketing & Lead Attribution',
  'Campaign management, content calendars, and lead source tracking.',
  'Marketing',
  'video',
  'online',
  NULL,
  NULL,
  25,
  60,
  'Marketing Team',
  '[]'::jsonb,
  '["Campaign management", "Lead attribution"]'::jsonb,
  true,
  true
),

-- HR / Onboarding
(
  'New Hire Onboarding',
  'Complete onboarding guide for all new employees joining Murivest.',
  'HR',
  'pdf',
  'online',
  '/docs/Murivest Documentation/18_Training_Manual_Murivest_Academy.docx',
  NULL,
  240,
  70,
  'All Employees',
  '[]'::jsonb,
  '["Company overview", "Systems training"]'::jsonb,
  true,
  true
),
(
  'Data Privacy & GDPR Compliance',
  'Understanding data protection requirements and handling sensitive information.',
  'Compliance',
  'document',
  'online',
  '/docs/Murivest Documentation/07_Security_Compliance_Document.docx',
  NULL,
  60,
  71,
  'All Employees',
  '[]'::jsonb,
  '["Data protection", "GDPR requirements"]'::jsonb,
  true,
  true
),
(
  'IT Security & Product Updates',
  'System security protocols, bug reporting, and product release procedures.',
  'IT',
  'video',
  'online',
  NULL,
  NULL,
  20,
  80,
  'All Employees',
  '[]'::jsonb,
  '["Security protocols", "Bug reporting"]'::jsonb,
  true,
  true
);

-- Learning Paths
INSERT INTO public.academy_learning_paths (
  name,
  description,
  category,
  course_ids,
  target_roles,
  target_departments,
  estimated_hours,
  is_active
) VALUES
(
  'Executive Track',
  'Complete learning path for executive leadership team members',
  'Executive',
  '[]'::jsonb,
  '["ceo", "cfo", "executive_admin"]'::jsonb,
  '["Executive"]'::jsonb,
  3.5,
  true
),
(
  'Sales Certification',
  'Required training for all sales team members',
  'Sales',
  '[]'::jsonb,
  '["sales_director", "sales_manager", "sales_executive"]'::jsonb,
  '["Sales"]'::jsonb,
  2.5,
  true
),
(
  'Finance Operations',
  'Required training for finance team members',
  'Finance',
  '[]'::jsonb,
  '["finance_manager", "finance_officer"]'::jsonb,
  '["Finance"]'::jsonb,
  4.0,
  true
),
(
  'Compliance & Legal',
  'Required compliance training for legal and compliance staff',
  'Legal',
  '[]'::jsonb,
  '["legal_manager", "legal_officer"]'::jsonb,
  '["Legal"]'::jsonb,
  3.5,
  true
),
(
  'New Hire Onboarding',
  'Required onboarding for all new employees',
  'HR',
  '[]'::jsonb,
  '[]'::jsonb,
  '["All Departments"]'::jsonb,
  3.5,
  true
);