grant select, insert, update, delete
on public.recommendations
to authenticated;


drop policy if exists
"Users can refresh recommendations"
on public.recommendations;


create policy
"Users can refresh recommendations"
on public.recommendations
for all
to authenticated
using (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
)
with check (
  public.has_workspace_role(
    public.audit_workspace_id(audit_id),
    array['owner', 'admin', 'member']
  )
);