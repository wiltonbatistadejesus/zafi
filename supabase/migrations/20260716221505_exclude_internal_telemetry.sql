create or replace function public.telemetry_cockpit_snapshot(p_secret text, p_recent_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_month timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;

  with public_events as (
    select *
    from public.telemetry_events
    where source_page not like '/admin%'
  ), today as (
    select * from public_events where created_at >= v_start
  ), first_seen as (
    select visitor_id, min(created_at) first_at from public_events group by visitor_id
  ), sources as (
    select source, count(distinct session_id) value from today where event_type = 'page_view' group by source
  ), partners as (
    select payload->>'partner_id' partner_id, payload->>'partner_name' partner_name, count(*) value
    from today where event_type = 'partner_clicked'
    group by payload->>'partner_id', payload->>'partner_name'
  ), pages as (
    select source_page, count(*) value from today where event_type = 'page_view'
    group by source_page order by value desc limit 5
  ), recent as (
    select e.id, e.event_type, e.session_id, e.visitor_id, e.source_page, e.source,
      e.consent, e.payload, e.schema_version, e.occurred_at, e.created_at,
      d.status ga4_status, d.response_code ga4_response_code, d.attempted_at ga4_attempted_at
    from public_events e
    left join lateral (
      select status, response_code, attempted_at
      from public.telemetry_deliveries
      where event_id = e.id and provider = 'ga4'
      order by attempted_at desc limit 1
    ) d on true
    order by e.created_at desc
    limit greatest(1, least(coalesce(p_recent_limit, 30), 100))
  )
  select jsonb_build_object(
    'generated_at', now(),
    'today_start', v_start,
    'visitors', (select count(distinct visitor_id) from today where event_type = 'page_view'),
    'new_visitors', (select count(*) from first_seen where first_at >= v_start),
    'sessions', (select count(distinct session_id) from today where event_type = 'page_view'),
    'analysis_started', (select count(*) from today where event_type = 'analysis_started'),
    'analysis_completed', (select count(*) from today where event_type = 'analysis_completed'),
    'partner_clicked', (select count(*) from today where event_type = 'partner_clicked'),
    'affiliate_click', (select count(*) from today where event_type = 'affiliate_click'),
    'month_analysis_completed', (select count(*) from public_events where event_type = 'analysis_completed' and created_at >= v_month),
    'ga4_accepted', (select count(*) from public.telemetry_deliveries d join today t on t.id = d.event_id where d.provider = 'ga4' and d.status = 'accepted'),
    'ga4_failed', (select count(*) from public.telemetry_deliveries d join today t on t.id = d.event_id where d.provider = 'ga4' and d.status in ('failed', 'not_configured')),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'value', value)) from sources), '[]'::jsonb),
    'partners', coalesce((select jsonb_agg(jsonb_build_object('partner_id', partner_id, 'partner_name', partner_name, 'value', value) order by value desc) from partners), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('page', source_page, 'value', value) order by value desc) from pages), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(to_jsonb(recent) order by created_at desc) from recent), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.telemetry_cockpit_snapshot(text,integer) from public, authenticated;
grant execute on function public.telemetry_cockpit_snapshot(text,integer) to anon;

comment on function public.telemetry_cockpit_snapshot(text,integer)
is 'Snapshot executivo da telemetria pública da Zafi; exclui rotas administrativas e exige segredo do servidor.';
