create or replace function public.replace_audit_recommendations(
  p_audit_id uuid,
  p_recommendations jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Oturum açılması gerekiyor.';
  end if;

  if p_audit_id is null then
    raise exception 'Ölçüm kimliği gereklidir.';
  end if;

  if jsonb_typeof(p_recommendations) is distinct from 'array' then
    raise exception 'Öneriler JSON dizisi olmalıdır.';
  end if;

  if jsonb_array_length(p_recommendations) > 50 then
    raise exception 'Tek seferde en fazla 50 öneri yenilenebilir.';
  end if;

  if not coalesce(
    public.has_workspace_role(
      public.audit_workspace_id(p_audit_id),
      array['owner', 'admin', 'member']
    ),
    false
  ) then
    raise exception 'Bu ölçüm için işlem yetkiniz yok.';
  end if;

  perform 1
  from public.audits
  where id = p_audit_id
  for update;

  if not found then
    raise exception 'Ölçüm bulunamadı.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_recommendations) as item
    where jsonb_typeof(item) <> 'object'
      or nullif(btrim(item->>'category'), '') is null
      or nullif(btrim(item->>'title'), '') is null
      or nullif(btrim(item->>'description'), '') is null
      or (
        item ? 'priority'
        and item->>'priority' not in ('low', 'medium', 'high')
      )
      or (
        item ? 'effort'
        and item->>'effort' not in ('low', 'medium', 'high')
      )
      or (
        item ? 'impact'
        and item->>'impact' not in ('low', 'medium', 'high')
      )
  ) then
    raise exception 'Öneri verisi geçersiz.';
  end if;

  delete from public.recommendations
  where audit_id = p_audit_id;

  insert into public.recommendations (
    audit_id,
    category,
    title,
    description,
    priority,
    effort,
    impact,
    status
  )
  select
    p_audit_id,
    btrim(item->>'category'),
    btrim(item->>'title'),
    btrim(item->>'description'),
    coalesce(nullif(item->>'priority', ''), 'medium'),
    coalesce(nullif(item->>'effort', ''), 'medium'),
    coalesce(nullif(item->>'impact', ''), 'medium'),
    'open'
  from jsonb_array_elements(p_recommendations) as item;

  get diagnostics inserted_count = row_count;

  return inserted_count;
end;
$$;

revoke all
on function public.replace_audit_recommendations(uuid, jsonb)
from public;

grant execute
on function public.replace_audit_recommendations(uuid, jsonb)
to authenticated;