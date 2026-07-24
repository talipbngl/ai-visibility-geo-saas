alter table public.brand_website_snapshots
add column if not exists technical_signals_json jsonb
not null default '{}'::jsonb;

alter table public.brand_website_snapshots
add column if not exists category_scores_json jsonb
not null default '{}'::jsonb;

comment on column public.brand_website_snapshots.technical_signals_json is
'Canonical, robots, schema, bağlantı, görsel ve sosyal meta sinyalleri';

comment on column public.brand_website_snapshots.category_scores_json is
'Teknik, yapı, içerik, güven ve genel analiz puanları';