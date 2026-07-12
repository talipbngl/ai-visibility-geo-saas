alter table public.prompts
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

update public.prompts
set is_archived = false
where is_archived is null;