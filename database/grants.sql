-- Authenticated kullanıcıların public schema içindeki tabloları kullanabilmesi için gerekli izinler

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.workspaces to authenticated;
grant select, insert, update, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.brands to authenticated;
grant select, insert, update, delete on table public.brand_aliases to authenticated;
grant select, insert, update, delete on table public.competitors to authenticated;
grant select, insert, update, delete on table public.competitor_aliases to authenticated;
grant select, insert, update, delete on table public.prompt_sets to authenticated;
grant select, insert, update, delete on table public.prompts to authenticated;
grant select, insert, update, delete on table public.audits to authenticated;
grant select, insert, update, delete on table public.audit_runs to authenticated;
grant select, insert, update, delete on table public.analyses to authenticated;
grant select, insert, update, delete on table public.audit_scores to authenticated;
grant select, insert, update, delete on table public.recommendations to authenticated;

-- İleride yeni tablo eklersek authenticated role otomatik izin alsın
alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;