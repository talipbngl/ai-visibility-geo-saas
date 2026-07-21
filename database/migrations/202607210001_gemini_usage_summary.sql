create or replace function
public.get_workspace_gemini_usage(
  p_workspace_id uuid,
  p_daily_limit integer default 50
)
returns table (
  daily_used integer,
  daily_limit integer,
  daily_remaining integer,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_used integer;
  v_resets_at timestamptz;
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

  v_limit := greatest(
    1,
    least(
      coalesce(p_daily_limit, 50),
      500
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

  v_resets_at :=
    pg_catalog.date_trunc(
      'day',
      pg_catalog.now()
    ) + interval '1 day';

  return query
  select
    coalesce(v_used, 0),
    v_limit,
    greatest(
      v_limit - coalesce(v_used, 0),
      0
    ),
    v_resets_at;
end;
$$;

revoke all
on function
public.get_workspace_gemini_usage(
  uuid,
  integer
)
from public;

grant execute
on function
public.get_workspace_gemini_usage(
  uuid,
  integer
)
to authenticated;