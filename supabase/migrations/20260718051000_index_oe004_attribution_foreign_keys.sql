-- OE-004 follow-up: cover attribution ledger foreign keys used in joins.
-- Kept separate because the main OE-004 migration was already applied to production.

create index if not exists recommendation_attribution_product_occurred_idx
  on public.recommendation_attribution_events (product_id, occurred_at desc);

create index if not exists recommendation_attribution_campaign_occurred_idx
  on public.recommendation_attribution_events (campaign_id, occurred_at desc)
  where campaign_id is not null;
