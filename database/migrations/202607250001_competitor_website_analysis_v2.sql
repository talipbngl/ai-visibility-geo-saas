alter table public.competitor_website_snapshots
add column if not exists technical_signals_json jsonb
not null default '{}'::jsonb;

alter table public.competitor_website_snapshots
add column if not exists category_scores_json jsonb
not null default '{}'::jsonb;

comment on column public.competitor_website_snapshots.technical_signals_json is
'Rakip sitesinde tespit edilen teknik, tarama ve sayfa sinyalleri.';

comment on column public.competitor_website_snapshots.category_scores_json is
'Rakip sitesinin teknik, yapı, içerik, güven ve genel kategori puanları.';