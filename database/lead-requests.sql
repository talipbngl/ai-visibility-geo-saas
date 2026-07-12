create table if not exists public.lead_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company_name text,
  website_url text,
  industry text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now(),

  constraint lead_requests_status_check
    check (status in ('new', 'contacted', 'qualified', 'closed', 'rejected'))
);

alter table public.lead_requests enable row level security;

drop policy if exists "Anyone can create lead requests" on public.lead_requests;

create policy "Anyone can create lead requests"
on public.lead_requests
for insert
to anon, authenticated
with check (true);
<Button asChild>
  <Link href="/request-report">İlk raporu iste</Link>
</Button>