alter table public.audit_scores
  alter column citation_score drop not null;

alter table public.audit_scores
  alter column citation_score drop default;