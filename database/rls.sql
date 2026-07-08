-- =========================================================
-- RLS HELPERS
-- =========================================================

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = public.current_profile_id()
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = public.current_profile_id()
      and wm.role = any(allowed_roles)
  );
$$;

create or replace function public.brand_workspace_id(target_brand_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from public.brands
  where id = target_brand_id
  limit 1;
$$;

create or replace function public.competitor_workspace_id(target_competitor_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.workspace_id
  from public.competitors c
  join public.brands b on b.id = c.brand_id
  where c.id = target_competitor_id
  limit 1;
$$;

create or replace function public.audit_workspace_id(target_audit_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from public.audits
  where id = target_audit_id
  limit 1;
$$;

create or replace function public.audit_run_workspace_id(target_audit_run_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.workspace_id
  from public.audit_runs ar
  join public.audits a on a.id = ar.audit_id
  where ar.id = target_audit_run_id
  limit 1;
$$;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
grant execute on function public.brand_workspace_id(uuid) to authenticated;
grant execute on function public.competitor_workspace_id(uuid) to authenticated;
grant execute on function public.audit_workspace_id(uuid) to authenticated;
grant execute on function public.audit_run_workspace_id(uuid) to authenticated;


-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.brands enable row level security;
alter table public.brand_aliases enable row level security;
alter table public.competitors enable row level security;
alter table public.competitor_aliases enable row level security;
alter table public.prompt_sets enable row level security;
alter table public.prompts enable row level security;
alter table public.audits enable row level security;
alter table public.audit_runs enable row level security;
alter table public.analyses enable row level security;
alter table public.audit_scores enable row level security;
alter table public.recommendations enable row level security;


-- =========================================================
-- PROFILES
-- =========================================================

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- =========================================================
-- WORKSPACES
-- =========================================================

drop policy if exists "Members can read workspaces" on public.workspaces;
create policy "Members can read workspaces"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "Users can create owned workspaces" on public.workspaces;
create policy "Users can create owned workspaces"
on public.workspaces
for insert
to authenticated
with check (owner_id = public.current_profile_id());

drop policy if exists "Owners and admins can update workspaces" on public.workspaces;
create policy "Owners and admins can update workspaces"
on public.workspaces
for update
to authenticated
using (public.has_workspace_role(id, array['owner', 'admin']))
with check (public.has_workspace_role(id, array['owner', 'admin']));

drop policy if exists "Owners can delete workspaces" on public.workspaces;
create policy "Owners can delete workspaces"
on public.workspaces
for delete
to authenticated
using (public.has_workspace_role(id, array['owner']));


-- =========================================================
-- WORKSPACE MEMBERS
-- =========================================================

drop policy if exists "Members can read workspace members" on public.workspace_members;
create policy "Members can read workspace members"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners and admins can add workspace members" on public.workspace_members;
create policy "Owners and admins can add workspace members"
on public.workspace_members
for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin'])
  or (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.owner_id = public.current_profile_id()
    )
  )
);

drop policy if exists "Owners and admins can update workspace members" on public.workspace_members;
create policy "Owners and admins can update workspace members"
on public.workspace_members
for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

drop policy if exists "Owners and admins can delete workspace members" on public.workspace_members;
create policy "Owners and admins can delete workspace members"
on public.workspace_members
for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));


-- =========================================================
-- BRANDS
-- =========================================================

drop policy if exists "Members can read brands" on public.brands;
create policy "Members can read brands"
on public.brands
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can insert brands" on public.brands;
create policy "Editors can insert brands"
on public.brands
for insert
to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']));

drop policy if exists "Editors can update brands" on public.brands;
create policy "Editors can update brands"
on public.brands
for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']));

drop policy if exists "Editors can delete brands" on public.brands;
create policy "Editors can delete brands"
on public.brands
for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']));


-- =========================================================
-- BRAND ALIASES
-- =========================================================

drop policy if exists "Members can read brand aliases" on public.brand_aliases;
create policy "Members can read brand aliases"
on public.brand_aliases
for select
to authenticated
using (public.is_workspace_member(public.brand_workspace_id(brand_id)));

drop policy if exists "Editors can insert brand aliases" on public.brand_aliases;
create policy "Editors can insert brand aliases"
on public.brand_aliases
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update brand aliases" on public.brand_aliases;
create policy "Editors can update brand aliases"
on public.brand_aliases
for update
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can delete brand aliases" on public.brand_aliases;
create policy "Editors can delete brand aliases"
on public.brand_aliases
for delete
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- COMPETITORS
-- =========================================================

drop policy if exists "Members can read competitors" on public.competitors;
create policy "Members can read competitors"
on public.competitors
for select
to authenticated
using (public.is_workspace_member(public.brand_workspace_id(brand_id)));

drop policy if exists "Editors can insert competitors" on public.competitors;
create policy "Editors can insert competitors"
on public.competitors
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update competitors" on public.competitors;
create policy "Editors can update competitors"
on public.competitors
for update
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can delete competitors" on public.competitors;
create policy "Editors can delete competitors"
on public.competitors
for delete
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- COMPETITOR ALIASES
-- =========================================================

drop policy if exists "Members can read competitor aliases" on public.competitor_aliases;
create policy "Members can read competitor aliases"
on public.competitor_aliases
for select
to authenticated
using (
  public.is_workspace_member(
    public.competitor_workspace_id(competitor_id)
  )
);

drop policy if exists "Editors can insert competitor aliases" on public.competitor_aliases;
create policy "Editors can insert competitor aliases"
on public.competitor_aliases
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.competitor_workspace_id(competitor_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update competitor aliases" on public.competitor_aliases;
create policy "Editors can update competitor aliases"
on public.competitor_aliases
for update
to authenticated
using (
  public.has_workspace_role(
    public.competitor_workspace_id(competitor_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.competitor_workspace_id(competitor_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can delete competitor aliases" on public.competitor_aliases;
create policy "Editors can delete competitor aliases"
on public.competitor_aliases
for delete
to authenticated
using (
  public.has_workspace_role(
    public.competitor_workspace_id(competitor_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- PROMPT SETS
-- =========================================================

drop policy if exists "Members can read prompt sets" on public.prompt_sets;
create policy "Members can read prompt sets"
on public.prompt_sets
for select
to authenticated
using (public.is_workspace_member(public.brand_workspace_id(brand_id)));

drop policy if exists "Editors can insert prompt sets" on public.prompt_sets;
create policy "Editors can insert prompt sets"
on public.prompt_sets
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update prompt sets" on public.prompt_sets;
create policy "Editors can update prompt sets"
on public.prompt_sets
for update
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can delete prompt sets" on public.prompt_sets;
create policy "Editors can delete prompt sets"
on public.prompt_sets
for delete
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- PROMPTS
-- =========================================================

drop policy if exists "Members can read prompts" on public.prompts;
create policy "Members can read prompts"
on public.prompts
for select
to authenticated
using (public.is_workspace_member(public.brand_workspace_id(brand_id)));

drop policy if exists "Editors can insert prompts" on public.prompts;
create policy "Editors can insert prompts"
on public.prompts
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update prompts" on public.prompts;
create policy "Editors can update prompts"
on public.prompts
for update
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can delete prompts" on public.prompts;
create policy "Editors can delete prompts"
on public.prompts
for delete
to authenticated
using (
  public.has_workspace_role(
    public.brand_workspace_id(brand_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- AUDITS
-- =========================================================

drop policy if exists "Members can read audits" on public.audits;
create policy "Members can read audits"
on public.audits
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Editors can insert audits" on public.audits;
create policy "Editors can insert audits"
on public.audits
for insert
to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']));

drop policy if exists "Editors can update audits" on public.audits;
create policy "Editors can update audits"
on public.audits
for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']));

drop policy if exists "Editors can delete audits" on public.audits;
create policy "Editors can delete audits"
on public.audits
for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'member']));


-- =========================================================
-- AUDIT RUNS
-- =========================================================

drop policy if exists "Members can read audit runs" on public.audit_runs;
create policy "Members can read audit runs"
on public.audit_runs
for select
to authenticated
using (public.is_workspace_member(public.audit_workspace_id(audit_id)));

drop policy if exists "Editors can insert audit runs" on public.audit_runs;
create policy "Editors can insert audit runs"
on public.audit_runs
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update audit runs" on public.audit_runs;
create policy "Editors can update audit runs"
on public.audit_runs
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

drop policy if exists "Editors can delete audit runs" on public.audit_runs;
create policy "Editors can delete audit runs"
on public.audit_runs
for delete
to authenticated
using (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- ANALYSES
-- =========================================================

drop policy if exists "Members can read analyses" on public.analyses;
create policy "Members can read analyses"
on public.analyses
for select
to authenticated
using (
  public.is_workspace_member(
    public.audit_run_workspace_id(audit_run_id)
  )
);

drop policy if exists "Editors can insert analyses" on public.analyses;
create policy "Editors can insert analyses"
on public.analyses
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.audit_run_workspace_id(audit_run_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update analyses" on public.analyses;
create policy "Editors can update analyses"
on public.analyses
for update
to authenticated
using (
  public.has_workspace_role(
    public.audit_run_workspace_id(audit_run_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.audit_run_workspace_id(audit_run_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can delete analyses" on public.analyses;
create policy "Editors can delete analyses"
on public.analyses
for delete
to authenticated
using (
  public.has_workspace_role(
    public.audit_run_workspace_id(audit_run_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- AUDIT SCORES
-- =========================================================

drop policy if exists "Members can read audit scores" on public.audit_scores;
create policy "Members can read audit scores"
on public.audit_scores
for select
to authenticated
using (public.is_workspace_member(public.audit_workspace_id(audit_id)));

drop policy if exists "Editors can insert audit scores" on public.audit_scores;
create policy "Editors can insert audit scores"
on public.audit_scores
for insert
to authenticated
with check (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);

drop policy if exists "Editors can update audit scores" on public.audit_scores;
create policy "Editors can update audit scores"
on public.audit_scores
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

drop policy if exists "Editors can delete audit scores" on public.audit_scores;
create policy "Editors can delete audit scores"
on public.audit_scores
for delete
to authenticated
using (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);


-- =========================================================
-- RECOMMENDATIONS
-- =========================================================

drop policy if exists "Members can read recommendations" on public.recommendations;
create policy "Members can read recommendations"
on public.recommendations
for select
to authenticated
using (public.is_workspace_member(public.audit_workspace_id(audit_id)));

drop policy if exists "Editors can insert recommendations" on public.recommendations;
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

drop policy if exists "Editors can update recommendations" on public.recommendations;
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

drop policy if exists "Editors can delete recommendations" on public.recommendations;
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