create or replace function
public.get_workspace_gemini_usage_breakdown(
  p_workspace_id uuid
)
returns table (
  operation text,
  usage_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
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

  return query
  select
    item.operation_name,
    count(event.id)::integer
      as usage_count
  from (
    values
      (
        1,
        'audit_prompt'::text
      ),
      (
        2,
        'prompt_generation'::text
      ),
      (
        3,
        'competitor_generation'::text
      )
  ) as item(
    sort_order,
    operation_name
  )
  left join
    public.gemini_usage_events event
    on event.workspace_id =
      p_workspace_id
    and event.operation =
      item.operation_name
    and event.created_at >=
      pg_catalog.date_trunc(
        'day',
        pg_catalog.now()
      )
  group by
    item.sort_order,
    item.operation_name
  order by
    item.sort_order;
end;
$$;

revoke all
on function
public.get_workspace_gemini_usage_breakdown(
  uuid
)
from public;

grant execute
on function
public.get_workspace_gemini_usage_breakdown(
  uuid
)
to authenticated;