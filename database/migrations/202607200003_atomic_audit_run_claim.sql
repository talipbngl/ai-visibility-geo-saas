create or replace function public.claim_audit_runs(
  p_audit_id uuid,
  p_limit integer default 5
)
returns table (
  run_id uuid,
  prompt_text text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum açılması gerekiyor.';
  end if;

  if not coalesce(
    public.has_workspace_role(
      public.audit_workspace_id(p_audit_id),
      array['owner', 'admin', 'member']
    ),
    false
  ) then
    raise exception 'Bu audit için işlem yetkiniz yok.';
  end if;

  return query
  with candidate_runs as materialized (
    select
      ar.id,
      coalesce(
        ar.prompt_text_snapshot,
        p.text
      )::text as resolved_prompt_text
    from public.audit_runs ar
    left join public.prompts p
      on p.id = ar.prompt_id
    where ar.audit_id = p_audit_id
      and ar.status in ('pending', 'failed')
      and coalesce(
        ar.prompt_text_snapshot,
        p.text
      ) is not null
    order by ar.created_at asc
    for update of ar skip locked
    limit greatest(
      1,
      least(coalesce(p_limit, 1), 5)
    )
  ),
  claimed_runs as (
    update public.audit_runs ar
    set
      status = 'running',
      started_at = now(),
      completed_at = null,
      error_message = null
    from candidate_runs candidate
    where ar.id = candidate.id
    returning ar.id
  )
  select
    claimed.id as run_id,
    candidate.resolved_prompt_text as prompt_text
  from claimed_runs claimed
  join candidate_runs candidate
    on candidate.id = claimed.id;
end;
$$;

revoke all
on function public.claim_audit_runs(uuid, integer)
from public;

grant execute
on function public.claim_audit_runs(uuid, integer)
to authenticated;