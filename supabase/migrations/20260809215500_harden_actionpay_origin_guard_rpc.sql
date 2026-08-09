revoke execute on function public.atlas_check_campaign_traffic(text, text, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.atlas_check_campaign_traffic(text, text, uuid, uuid, text, text)
  to service_role;

revoke execute on function public.recommendation_apply_traffic_policy(text, uuid)
  from public, anon, authenticated;
grant execute on function public.recommendation_apply_traffic_policy(text, uuid)
  to service_role;