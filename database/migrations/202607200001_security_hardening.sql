-- =========================================================
-- 1. RECOMMENDATION RLS GÜVENLİĞİ
-- =========================================================

drop policy if exists "Users can refresh recommendations"
on public.recommendations;

drop policy if exists "Members can read recommendations"
on public.recommendations;

drop policy if exists "Editors can insert recommendations"
on public.recommendations;

drop policy if exists "Editors can update recommendations"
on public.recommendations;

drop policy if exists "Editors can delete recommendations"
on public.recommendations;


create policy "Members can read recommendations"
on public.recommendations
for select
to authenticated
using (
  public.is_workspace_member(
    public.audit_workspace_id(audit_id)
  )
);


create policy "Editors can insert recommendations"
on public.recommendations
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);


create policy "Editors can update recommendations"
on public.recommendations
for update
to authenticated
using (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);


create policy "Editors can delete recommendations"
on public.recommendations
for delete
to authenticated
using (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- 2. LEAD FORMU RATE LIMIT TABLOSU
-- =========================================================

create table if not exists public.lead_request_rate_limits (
  identifier_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1,
  updated_at timestamptz not null default now()
);


alter table public.lead_request_rate_limits
enable row level security;


revoke all
on table public.lead_request_rate_limits
from anon, authenticated;


-- =========================================================
-- 3. LEAD FORMU RATE LIMIT FONKSİYONU
-- =========================================================

create or replace function public.consume_lead_request_rate_limit(
  p_identifier_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_count integer;
begin
  if p_identifier_hash is null
    or length(p_identifier_hash) <> 64 then
    return false;
  end if;

  insert into public.lead_request_rate_limits as limits (
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_identifier_hash,
    now(),
    1,
    now()
  )
  on conflict (identifier_hash) do update
  set
    window_started_at = case
      when limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
      then now()
      else limits.window_started_at
    end,

    request_count = case
      when limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
      then 1
      else limits.request_count + 1
    end,

    updated_at = now()

  returning request_count
  into v_request_count;

  return v_request_count <= greatest(1, p_limit);
end;
$$;


revoke all
on function public.consume_lead_request_rate_limit(
  text,
  integer,
  integer
)
from public, anon, authenticated;


grant execute
on function public.consume_lead_request_rate_limit(
  text,
  integer,
  integer
)
to service_role;