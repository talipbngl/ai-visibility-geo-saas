alter table public.gemini_usage_events
alter column audit_id
drop not null;

alter table public.gemini_usage_events
alter column audit_run_id
drop not null;

alter table public.gemini_usage_events
add column if not exists
operation text;

update public.gemini_usage_events
set operation = 'audit_prompt'
where operation is null;

alter table public.gemini_usage_events
alter column operation
set default 'audit_prompt';

alter table public.gemini_usage_events
alter column operation
set not null;

alter table public.gemini_usage_events
drop constraint if exists
gemini_usage_events_operation_check;

alter table public.gemini_usage_events
add constraint
gemini_usage_events_operation_check
check (
  operation in (
    'audit_prompt',
    'prompt_generation',
    'competitor_generation'
  )
);

create or replace function
public.consume_gemini_usage(
  p_workspace_id uuid,
  p_operation text,
  p_daily_limit integer default 50
)
returns table (
  daily_used integer,
  daily_limit integer,
  daily_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_used integer;
begin
  if auth.uid() is null then
    raise exception
      'Oturum açılması gerekiyor.';
  end if;

  if not coalesce(
    public.is_workspace_member(
      p_workspace_id
    ),
    false
  ) then
    raise exception
      'Bu çalışma alanına erişim yetkiniz yok.';
  end if;

  if p_operation not in (
    'prompt_generation',
    'competitor_generation'
  ) then
    raise exception
      'Geçersiz Gemini işlem türü.';
  end if;

  v_limit := greatest(
    1,
    least(
      coalesce(p_daily_limit, 50),
      500
    )
  );

  perform
    pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        p_workspace_id::text,
        0
      )
    );

  select count(*)::integer
  into v_used
  from public.gemini_usage_events event
  where event.workspace_id =
    p_workspace_id
    and event.created_at >=
      pg_catalog.date_trunc(
        'day',
        pg_catalog.now()
      );

  if coalesce(v_used, 0) >= v_limit then
    raise exception
      'Günlük Gemini prompt limiti doldu (%). Limit UTC gece yarısında yenilenir.',
      v_limit;
  end if;

  insert into
  public.gemini_usage_events (
    workspace_id,
    operation
  )
  values (
    p_workspace_id,
    p_operation
  );

  v_used :=
    coalesce(v_used, 0) + 1;

  return query
  select
    v_used,
    v_limit,
    greatest(
      v_limit - v_used,
      0
    );
end;
$$;

revoke all
on function
public.consume_gemini_usage(
  uuid,
  text,
  integer
)
from public;

grant execute
on function
public.consume_gemini_usage(
  uuid,
  text,
  integer
)
to authenticated;