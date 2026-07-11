alter table public.audit_runs
  add column if not exists prompt_text_snapshot text,
  add column if not exists prompt_intent_snapshot text,
  add column if not exists prompt_priority_snapshot integer,
  add column if not exists prompt_language_snapshot text,
  add column if not exists prompt_country_snapshot text,
  add column if not exists prompt_city_snapshot text;

update public.audit_runs as ar
set
  prompt_text_snapshot = coalesce(ar.prompt_text_snapshot, p.text),
  prompt_intent_snapshot = coalesce(ar.prompt_intent_snapshot, p.intent),
  prompt_priority_snapshot = coalesce(ar.prompt_priority_snapshot, p.priority),
  prompt_language_snapshot = coalesce(ar.prompt_language_snapshot, p.language),
  prompt_country_snapshot = coalesce(ar.prompt_country_snapshot, p.country),
  prompt_city_snapshot = coalesce(ar.prompt_city_snapshot, p.city)
from public.prompts as p
where ar.prompt_id = p.id;