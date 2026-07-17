create index if not exists affiliate_conversions_original_click_idx
  on public.affiliate_conversions (original_click_id)
  where original_click_id is not null;
