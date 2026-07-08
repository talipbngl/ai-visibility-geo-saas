create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references profiles(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  website_url text,
  industry text,
  country text default 'TR',
  language text default 'tr',
  description text,
  target_audience text,
  primary_offer text,
  created_at timestamptz not null default now()
);

create table brand_aliases (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now()
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  website_url text,
  description text,
  created_at timestamptz not null default now()
);

create table competitor_aliases (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now()
);

create table prompt_sets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_set_id uuid not null references prompt_sets(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  text text not null,
  intent text not null,
  priority integer not null default 1,
  language text default 'tr',
  country text default 'TR',
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table audits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  status text not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  total_prompts integer not null default 0,
  completed_prompts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table audit_runs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  engine text not null,
  model text,
  raw_answer text,
  raw_response_json jsonb,
  citations_json jsonb,
  status text not null default 'pending',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid not null unique references audit_runs(id) on delete cascade,
  brand_mentioned boolean not null default false,
  brand_rank integer,
  brand_sentiment text,
  competitors_json jsonb,
  sources_json jsonb,
  summary text,
  risk_notes_json jsonb,
  opportunity_notes_json jsonb,
  confidence_score numeric,
  created_at timestamptz not null default now()
);

create table audit_scores (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null unique references audits(id) on delete cascade,
  visibility_score numeric not null default 0,
  share_of_voice numeric not null default 0,
  average_rank numeric,
  positive_sentiment_rate numeric not null default 0,
  citation_score numeric not null default 0,
  competitor_gap_score numeric not null default 0,
  opportunity_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  priority text not null default 'medium',
  effort text not null default 'medium',
  impact text not null default 'medium',
  status text not null default 'open',
  created_at timestamptz not null default now()
);