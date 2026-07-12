create table if not exists public.competitor_website_snapshots (
  id uuid primary key default gen_random_uuid(),

  competitor_id uuid not null references public.competitors(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,

  website_url text not null,
  status text not null default 'completed',
  http_status integer,

  title text,
  meta_description text,
  headings_json jsonb not null default '{}'::jsonb,
  extracted_text text,
  word_count integer not null default 0,

  service_signals_json jsonb not null default '[]'::jsonb,
  trust_signals_json jsonb not null default '[]'::jsonb,

  content_score numeric not null default 0,
  error_message text,

  created_at timestamptz not null default now(),

  constraint competitor_website_snapshots_status_check
    check (status in ('completed', 'failed'))
);

create index if not exists competitor_website_snapshots_competitor_id_created_at_idx
on public.competitor_website_snapshots (competitor_id, created_at desc);

create index if not exists competitor_website_snapshots_brand_id_created_at_idx
on public.competitor_website_snapshots (brand_id, created_at desc);

alter table public.competitor_website_snapshots enable row level security;

drop policy if exists "Users can read competitor website snapshots"
on public.competitor_website_snapshots;

create policy "Users can read competitor website snapshots"
on public.competitor_website_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.competitors c
    where c.id = competitor_website_snapshots.competitor_id
  )
);

drop policy if exists "Users can insert competitor website snapshots"
on public.competitor_website_snapshots;

create policy "Users can insert competitor website snapshots"
on public.competitor_website_snapshots
for insert
to authenticated
with check (
  exists (
    select 1
    from public.competitors c
    where c.id = competitor_website_snapshots.competitor_id
  )
);

grant select, insert on public.competitor_website_snapshots to authenticated;