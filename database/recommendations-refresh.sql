grant select, insert, update, delete on public.recommendations to authenticated;

drop policy if exists "Users can refresh recommendations"
on public.recommendations;

create policy "Users can refresh recommendations"
on public.recommendations
for all
to authenticated
using (
  exists (
    select 1
    from public.audits a
    where a.id = recommendations.audit_id
  )
)
with check (
  exists (
    select 1
    from public.audits a
    where a.id = recommendations.audit_id
  )
);