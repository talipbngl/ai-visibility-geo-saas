create or replace function public.ensure_current_user_workspace()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_full_name text := nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', '');
  v_profile_id uuid;
  v_workspace_id uuid;
  v_slug_base text;
begin
  if v_auth_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id
  into v_profile_id
  from public.profiles
  where user_id = v_auth_user_id
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (
      user_id,
      full_name,
      email
    )
    values (
      v_auth_user_id,
      v_full_name,
      nullif(v_email, '')
    )
    returning id into v_profile_id;
  end if;

  select wm.workspace_id
  into v_workspace_id
  from public.workspace_members wm
  where wm.user_id = v_profile_id
  order by wm.created_at asc
  limit 1;

  if v_workspace_id is null then
    v_slug_base := lower(
      regexp_replace(
        split_part(coalesce(nullif(v_email, ''), v_auth_user_id::text), '@', 1),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    );

    v_slug_base := trim(both '-' from v_slug_base);

    if v_slug_base = '' then
      v_slug_base := 'workspace';
    end if;

    insert into public.workspaces (
      name,
      slug,
      owner_id,
      plan
    )
    values (
      coalesce(nullif(v_full_name, ''), nullif(v_email, ''), 'User') || ' Workspace',
      v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      v_profile_id,
      'free'
    )
    returning id into v_workspace_id;

    insert into public.workspace_members (
      workspace_id,
      user_id,
      role
    )
    values (
      v_workspace_id,
      v_profile_id,
      'owner'
    )
    on conflict (workspace_id, user_id) do nothing;
  end if;

  return v_workspace_id;
end;
$$;

grant execute on function public.ensure_current_user_workspace() to authenticated;