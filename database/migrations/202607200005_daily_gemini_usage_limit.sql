create table if not exists
public.gemini_usage_events (
  id bigint
    generated always as identity
    primary key,

  workspace_id uuid not null
    references public.workspaces(id)
    on delete cascade,

  audit_id uuid not null
    references public.audits(id)
    on delete cascade,

  audit_run_id uuid not null
    references public.audit_runs(id)
    on delete cascade,

  created_at timestamptz
    not null
    default now()
);

create index if not exists
gemini_usage_events_workspace_created_idx
on public.gemini_usage_events (
  workspace_id,
  created_at desc
);

alter table public.gemini_usage_events
enable row level security;

revoke all
on table public.gemini_usage_events
from anon, authenticated;

grant select, insert
on table public.gemini_usage_events
to service_role;

drop function if exists
public.claim_audit_runs(uuid, integer);

create or replace function
public.claim_audit_runs(
  p_audit_id uuid,
  p_limit integer default 5,
  p_daily_limit integer default 50
)
returns table (
  run_id uuid,
  prompt_text text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_daily_limit integer;
  v_daily_used integer;
  v_remaining integer;
begin
  if auth.uid() is null then
    raise exception
      'Oturum açılması gerekiyor.';
  end if;

  v_workspace_id :=
    public.audit_workspace_id(
      p_audit_id
    );

  if v_workspace_id is null then
    raise exception
      'Audit workspace bilgisi bulunamadı.';
  end if;

  if not coalesce(
    public.has_workspace_role(
      v_workspace_id,
      array[
        'owner',
        'admin',
        'member'
      ]
    ),
    false
  ) then
    raise exception
      'Bu audit için işlem yetkiniz yok.';
  end if;

  v_daily_limit := greatest(
    1,
    least(
      coalesce(p_daily_limit, 50),
      500
    )
  );

  perform
    pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_workspace_id::text,
        0
      )
    );

  select count(*)::integer
  into v_daily_used
  from public.gemini_usage_events event
  where event.workspace_id =
    v_workspace_id
    and event.created_at >=
      pg_catalog.date_trunc(
        'day',
        pg_catalog.now()
      );

  v_remaining :=
    v_daily_limit -
    coalesce(v_daily_used, 0);

  if v_remaining <= 0 then
    raise exception
      'Günlük Gemini prompt limiti doldu (%). Limit UTC gece yarısında yenilenir.',
      v_daily_limit;
  end if;

  return query
  with candidate_runs as materialized (
    select
      ar.id,
      coalesce(
        ar.prompt_text_snapshot,
        p.text
      )::text
        as resolved_prompt_text
    from public.audit_runs ar
    left join public.prompts p
      on p.id = ar.prompt_id
    where ar.audit_id = p_audit_id
      and (
        ar.status in (
          'pending',
          'failed'
        )
        or (
          ar.status = 'running'
          and ar.started_at <
            pg_catalog.now()
            - interval '5 minutes'
        )
      )
      and coalesce(
        ar.prompt_text_snapshot,
        p.text
      ) is not null
    order by ar.created_at asc
    for update of ar skip locked
    limit least(
      greatest(
        1,
        least(
          coalesce(p_limit, 1),
          5
        )
      ),
      v_remaining
    )
  ),
  claimed_runs as (
    update public.audit_runs ar
    set
      status = 'running',
      started_at =
        pg_catalog.now(),
      completed_at = null,
      error_message = null
    from candidate_runs candidate
    where ar.id = candidate.id
    returning ar.id
  ),
  usage_events as (
    insert into
    public.gemini_usage_events (
      workspace_id,
      audit_id,
      audit_run_id
    )
    select
      v_workspace_id,
      p_audit_id,
      claimed.id
    from claimed_runs claimed
    returning audit_run_id
  )
  select
    claimed.id as run_id,
    candidate.resolved_prompt_text
      as prompt_text
  from claimed_runs claimed
  join candidate_runs candidate
    on candidate.id = claimed.id
  join usage_events usage
    on usage.audit_run_id =
      claimed.id;
end;
$$;

revoke all
on function public.claim_audit_runs(
  uuid,
  integer,
  integer
)
from public;

grant execute
on function public.claim_audit_runs(
  uuid,
  integer,
  integer
)
to authenticated;