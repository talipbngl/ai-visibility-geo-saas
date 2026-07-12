create table if not exists public.brand_website_snapshots (
  id uuid primary key default gen_random_uuid(),
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

  constraint brand_website_snapshots_status_check
    check (status in ('completed', 'failed'))
);

create index if not exists brand_website_snapshots_brand_id_created_at_idx
on public.brand_website_snapshots (brand_id, created_at desc);

alter table public.brand_website_snapshots enable row level security;

drop policy if exists "Users can read website snapshots for their brands"
on public.brand_website_snapshots;

create policy "Users can read website snapshots for their brands"
on public.brand_website_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.brands b
    where b.id = brand_website_snapshots.brand_id
  )
);

drop policy if exists "Users can insert website snapshots for their brands"
on public.brand_website_snapshots;

create policy "Users can insert website snapshots for their brands"
on public.brand_website_snapshots
for insert
to authenticated
with check (
  exists (
    select 1
    from public.brands b
    where b.id = brand_website_snapshots.brand_id
  )
);

grant select, insert on public.brand_website_snapshots to authenticated;