create index if not exists recommendation_decisions_product_idx
  on public.recommendation_decisions (product_id);
create index if not exists recommendation_decisions_campaign_idx
  on public.recommendation_decisions (campaign_id) where campaign_id is not null;
