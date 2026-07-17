create table if not exists public.affiliate_clicks (
  id uuid primary key,
  telemetry_event_id uuid not null unique references public.telemetry_events(id),
  partner_id text not null,
  partner_name text not null,
  campaign_id text not null,
  campaign_name text not null,
  network text not null,
  session_id uuid not null,
  visitor_id uuid not null,
  source_page text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  transaction_id text not null,
  original_click_id uuid references public.affiliate_clicks(id),
  partner_id text not null,
  partner_name text not null,
  campaign_id text not null,
  campaign_name text not null,
  session_id uuid,
  visitor_id uuid,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  commission numeric(14,4) check (commission is null or commission >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  converted_at timestamptz,
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  last_event_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, transaction_id)
);

create table if not exists public.affiliate_conversion_events (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references public.affiliate_conversions(id),
  idempotency_key text not null unique,
  transaction_id text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  commission numeric(14,4) check (commission is null or commission >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  event_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  raw_payload_hash text not null,
  request_id text,
  received_at timestamptz not null default now()
);

create table if not exists public.affiliate_postback_audit (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  network text not null,
  idempotency_key text,
  transaction_id text,
  original_click_id uuid,
  partner_id text,
  campaign_id text,
  outcome text not null check (outcome in ('accepted', 'duplicate', 'rejected')),
  http_status integer not null,
  reason text,
  raw_payload jsonb not null default '{}'::jsonb,
  raw_payload_hash text not null,
  received_at timestamptz not null default now()
);

create index if not exists affiliate_clicks_partner_created_idx
  on public.affiliate_clicks (partner_id, created_at desc);
create index if not exists affiliate_clicks_campaign_created_idx
  on public.affiliate_clicks (campaign_id, created_at desc);
create index if not exists affiliate_clicks_session_created_idx
  on public.affiliate_clicks (session_id, created_at desc);
create index if not exists affiliate_conversions_status_received_idx
  on public.affiliate_conversions (status, last_received_at desc);
create index if not exists affiliate_conversions_partner_status_idx
  on public.affiliate_conversions (partner_id, status, last_received_at desc);
create index if not exists affiliate_conversion_events_conversion_idx
  on public.affiliate_conversion_events (conversion_id, received_at desc);
create index if not exists affiliate_postback_audit_received_idx
  on public.affiliate_postback_audit (received_at desc);

alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.affiliate_conversion_events enable row level security;
alter table public.affiliate_postback_audit enable row level security;

revoke all on table public.affiliate_clicks from anon, authenticated;
revoke all on table public.affiliate_conversions from anon, authenticated;
revoke all on table public.affiliate_conversion_events from anon, authenticated;
revoke all on table public.affiliate_postback_audit from anon, authenticated;

create policy affiliate_clicks_deny_direct_access on public.affiliate_clicks
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_conversions_deny_direct_access on public.affiliate_conversions
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_conversion_events_deny_direct_access on public.affiliate_conversion_events
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_postback_audit_deny_direct_access on public.affiliate_postback_audit
  as restrictive for all to anon, authenticated using (false) with check (false);

drop trigger if exists affiliate_clicks_append_only on public.affiliate_clicks;
create trigger affiliate_clicks_append_only
before update or delete on public.affiliate_clicks
for each row execute function public.telemetry_block_mutation();

drop trigger if exists affiliate_conversion_events_append_only on public.affiliate_conversion_events;
create trigger affiliate_conversion_events_append_only
before update or delete on public.affiliate_conversion_events
for each row execute function public.telemetry_block_mutation();

drop trigger if exists affiliate_postback_audit_append_only on public.affiliate_postback_audit;
create trigger affiliate_postback_audit_append_only
before update or delete on public.affiliate_postback_audit
for each row execute function public.telemetry_block_mutation();

create or replace function public.affiliate_record_click(
  p_secret text,
  p_click_id uuid,
  p_telemetry_event_id uuid,
  p_partner_id text,
  p_partner_name text,
  p_campaign_id text,
  p_campaign_name text,
  p_network text,
  p_session_id uuid,
  p_visitor_id uuid,
  p_source_page text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.telemetry_events%rowtype;
  v_click_id uuid;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;

  select * into v_event from public.telemetry_events where id = p_telemetry_event_id;
  if v_event.id is null or v_event.event_type <> 'partner_clicked' then
    raise exception 'partner click telemetry event not found';
  end if;
  if v_event.session_id <> p_session_id or v_event.visitor_id <> p_visitor_id
     or coalesce(v_event.payload->>'partner_id', '') <> p_partner_id then
    raise exception 'partner click context mismatch';
  end if;

  insert into public.affiliate_clicks (
    id, telemetry_event_id, partner_id, partner_name, campaign_id,
    campaign_name, network, session_id, visitor_id, source_page, occurred_at
  ) values (
    p_click_id, p_telemetry_event_id, left(p_partner_id, 120), left(p_partner_name, 200),
    left(p_campaign_id, 120), left(p_campaign_name, 300), left(p_network, 80),
    p_session_id, p_visitor_id, left(p_source_page, 2048), coalesce(p_occurred_at, now())
  )
  on conflict (telemetry_event_id) do nothing;

  select id into v_click_id
  from public.affiliate_clicks
  where telemetry_event_id = p_telemetry_event_id;

  return v_click_id;
end;
$$;

create or replace function public.affiliate_record_postback_audit(
  p_secret text,
  p_request_id text,
  p_network text,
  p_outcome text,
  p_http_status integer,
  p_reason text,
  p_raw_payload jsonb,
  p_raw_payload_hash text,
  p_idempotency_key text default null,
  p_transaction_id text default null,
  p_original_click_id uuid default null,
  p_partner_id text default null,
  p_campaign_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if p_outcome not in ('accepted', 'duplicate', 'rejected') then
    raise exception 'invalid postback audit outcome';
  end if;
  if octet_length(coalesce(p_raw_payload, '{}'::jsonb)::text) > 32768 then
    raise exception 'postback payload too large';
  end if;

  insert into public.affiliate_postback_audit (
    request_id, network, idempotency_key, transaction_id, original_click_id,
    partner_id, campaign_id, outcome, http_status, reason, raw_payload, raw_payload_hash
  ) values (
    left(p_request_id, 200), left(p_network, 80), left(p_idempotency_key, 128),
    left(p_transaction_id, 200), p_original_click_id, left(p_partner_id, 120),
    left(p_campaign_id, 120), p_outcome, p_http_status, left(p_reason, 1000),
    coalesce(p_raw_payload, '{}'::jsonb), left(p_raw_payload_hash, 128)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.affiliate_record_conversion(
  p_secret text,
  p_request_id text,
  p_network text,
  p_idempotency_key text,
  p_transaction_id text,
  p_original_click_id uuid,
  p_partner_id text,
  p_partner_name text,
  p_campaign_id text,
  p_campaign_name text,
  p_status text,
  p_commission numeric,
  p_currency text,
  p_event_at timestamptz,
  p_converted_at timestamptz,
  p_raw_payload jsonb,
  p_raw_payload_hash text,
  p_schema_version integer default 1
)
returns table(conversion_id uuid, conversion_event_id uuid, duplicate boolean, persisted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_click public.affiliate_clicks%rowtype;
  v_conversion_id uuid;
  v_event_id uuid;
  v_existing_event uuid;
  v_now timestamptz := now();
  v_event_at timestamptz := coalesce(p_event_at, now());
  v_partner_id text;
  v_partner_name text;
  v_campaign_id text;
  v_campaign_name text;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if nullif(trim(p_transaction_id), '') is null or length(p_transaction_id) > 200 then
    raise exception 'invalid transaction id';
  end if;
  if p_status not in ('pending', 'approved', 'rejected', 'cancelled') then
    raise exception 'invalid conversion status';
  end if;
  if p_commission is not null and p_commission < 0 then
    raise exception 'invalid commission';
  end if;
  if p_currency is not null and upper(p_currency) !~ '^[A-Z]{3}$' then
    raise exception 'invalid currency';
  end if;
  if p_status = 'approved' and (p_commission is null or p_currency is null) then
    raise exception 'approved conversion requires commission and currency';
  end if;
  if octet_length(coalesce(p_raw_payload, '{}'::jsonb)::text) > 32768 then
    raise exception 'postback payload too large';
  end if;

  if p_original_click_id is not null then
    select * into v_click from public.affiliate_clicks where id = p_original_click_id;
  end if;

  v_partner_id := coalesce(v_click.partner_id, nullif(trim(p_partner_id), ''));
  v_partner_name := coalesce(v_click.partner_name, nullif(trim(p_partner_name), ''));
  v_campaign_id := coalesce(v_click.campaign_id, nullif(trim(p_campaign_id), ''));
  v_campaign_name := coalesce(v_click.campaign_name, nullif(trim(p_campaign_name), ''));

  if v_partner_id is null or v_partner_name is null or v_campaign_id is null or v_campaign_name is null then
    raise exception 'partner and campaign could not be identified';
  end if;
  if v_click.id is not null and p_campaign_id is not null and p_campaign_id <> v_click.campaign_id then
    raise exception 'click and campaign mismatch';
  end if;

  select e.id, e.conversion_id into v_existing_event, v_conversion_id
  from public.affiliate_conversion_events e
  where e.idempotency_key = p_idempotency_key;

  if v_existing_event is not null then
    insert into public.affiliate_postback_audit (
      request_id, network, idempotency_key, transaction_id, original_click_id,
      partner_id, campaign_id, outcome, http_status, reason, raw_payload, raw_payload_hash
    ) values (
      left(p_request_id, 200), left(p_network, 80), left(p_idempotency_key, 128),
      left(p_transaction_id, 200), p_original_click_id, left(v_partner_id, 120),
      left(v_campaign_id, 120), 'duplicate', 200, 'Idempotent replay; no financial mutation.',
      coalesce(p_raw_payload, '{}'::jsonb), left(p_raw_payload_hash, 128)
    );
    return query select v_conversion_id, v_existing_event, true, v_now;
    return;
  end if;

  insert into public.affiliate_conversions (
    network, transaction_id, original_click_id, partner_id, partner_name,
    campaign_id, campaign_name, session_id, visitor_id, status, commission,
    currency, converted_at, first_received_at, last_received_at, last_event_at,
    raw_payload, schema_version
  ) values (
    left(p_network, 80), left(p_transaction_id, 200), v_click.id, left(v_partner_id, 120),
    left(v_partner_name, 200), left(v_campaign_id, 120), left(v_campaign_name, 300),
    v_click.session_id, v_click.visitor_id, p_status, p_commission, upper(p_currency),
    p_converted_at, v_now, v_now, v_event_at, coalesce(p_raw_payload, '{}'::jsonb),
    greatest(1, coalesce(p_schema_version, 1))
  )
  on conflict (network, transaction_id) do update set
    original_click_id = coalesce(public.affiliate_conversions.original_click_id, excluded.original_click_id),
    partner_id = excluded.partner_id,
    partner_name = excluded.partner_name,
    campaign_id = excluded.campaign_id,
    campaign_name = excluded.campaign_name,
    session_id = coalesce(public.affiliate_conversions.session_id, excluded.session_id),
    visitor_id = coalesce(public.affiliate_conversions.visitor_id, excluded.visitor_id),
    status = case when excluded.last_event_at >= public.affiliate_conversions.last_event_at then excluded.status else public.affiliate_conversions.status end,
    commission = case when excluded.last_event_at >= public.affiliate_conversions.last_event_at then excluded.commission else public.affiliate_conversions.commission end,
    currency = case when excluded.last_event_at >= public.affiliate_conversions.last_event_at then excluded.currency else public.affiliate_conversions.currency end,
    converted_at = case when excluded.last_event_at >= public.affiliate_conversions.last_event_at then coalesce(excluded.converted_at, public.affiliate_conversions.converted_at) else public.affiliate_conversions.converted_at end,
    last_received_at = v_now,
    last_event_at = greatest(public.affiliate_conversions.last_event_at, excluded.last_event_at),
    raw_payload = case when excluded.last_event_at >= public.affiliate_conversions.last_event_at then excluded.raw_payload else public.affiliate_conversions.raw_payload end,
    schema_version = greatest(public.affiliate_conversions.schema_version, excluded.schema_version),
    updated_at = v_now
  returning id into v_conversion_id;

  insert into public.affiliate_conversion_events (
    conversion_id, idempotency_key, transaction_id, status, commission, currency,
    event_at, raw_payload, raw_payload_hash, request_id
  ) values (
    v_conversion_id, left(p_idempotency_key, 128), left(p_transaction_id, 200),
    p_status, p_commission, upper(p_currency), v_event_at,
    coalesce(p_raw_payload, '{}'::jsonb), left(p_raw_payload_hash, 128), left(p_request_id, 200)
  ) returning id into v_event_id;

  insert into public.affiliate_postback_audit (
    request_id, network, idempotency_key, transaction_id, original_click_id,
    partner_id, campaign_id, outcome, http_status, reason, raw_payload, raw_payload_hash
  ) values (
    left(p_request_id, 200), left(p_network, 80), left(p_idempotency_key, 128),
    left(p_transaction_id, 200), p_original_click_id, left(v_partner_id, 120),
    left(v_campaign_id, 120), 'accepted', 201, 'Conversion state persisted.',
    coalesce(p_raw_payload, '{}'::jsonb), left(p_raw_payload_hash, 128)
  );

  return query select v_conversion_id, v_event_id, false, v_now;
end;
$$;

create or replace function public.telemetry_cockpit_snapshot(p_secret text, p_recent_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_week timestamptz := date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_month timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;

  with public_events as (
    select * from public.telemetry_events where source_page not like '/admin%'
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
      select status, response_code, attempted_at from public.telemetry_deliveries
      where event_id = e.id and provider = 'ga4' order by attempted_at desc limit 1
    ) d on true
    order by e.created_at desc
    limit greatest(1, least(coalesce(p_recent_limit, 30), 100))
  ), recent_conversions as (
    select id, transaction_id, partner_id, partner_name, campaign_id, campaign_name,
      status, commission, currency, original_click_id, converted_at,
      first_received_at, last_received_at, updated_at
    from public.affiliate_conversions
    order by last_received_at desc
    limit greatest(1, least(coalesce(p_recent_limit, 30), 100))
  ), revenue_today as (
    select currency, sum(commission) value from public.affiliate_conversions
    where status = 'approved' and last_event_at >= v_start group by currency
  ), revenue_week as (
    select currency, sum(commission) value from public.affiliate_conversions
    where status = 'approved' and last_event_at >= v_week group by currency
  ), revenue_month as (
    select currency, sum(commission) value from public.affiliate_conversions
    where status = 'approved' and last_event_at >= v_month group by currency
  ), revenue_total as (
    select currency, sum(commission) value from public.affiliate_conversions
    where status = 'approved' group by currency
  ), conversion_partners as (
    select partner_id, partner_name, count(*) conversions, sum(commission) revenue, currency
    from public.affiliate_conversions
    where status = 'approved'
    group by partner_id, partner_name, currency
    order by conversions desc, revenue desc
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
    'conversions_today', (select count(*) from public.affiliate_conversions where status = 'approved' and last_event_at >= v_start),
    'conversions_week', (select count(*) from public.affiliate_conversions where status = 'approved' and last_event_at >= v_week),
    'conversions_month', (select count(*) from public.affiliate_conversions where status = 'approved' and last_event_at >= v_month),
    'conversions_total', (select count(*) from public.affiliate_conversions where status = 'approved'),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'value', value)) from sources), '[]'::jsonb),
    'partners', coalesce((select jsonb_agg(jsonb_build_object('partner_id', partner_id, 'partner_name', partner_name, 'value', value) order by value desc) from partners), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('page', source_page, 'value', value) order by value desc) from pages), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(to_jsonb(recent) order by created_at desc) from recent), '[]'::jsonb),
    'recent_conversions', coalesce((select jsonb_agg(to_jsonb(recent_conversions) order by last_received_at desc) from recent_conversions), '[]'::jsonb),
    'conversion_partners', coalesce((select jsonb_agg(to_jsonb(conversion_partners) order by conversions desc, revenue desc) from conversion_partners), '[]'::jsonb),
    'revenue_today', coalesce((select jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency) from revenue_today), '[]'::jsonb),
    'revenue_week', coalesce((select jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency) from revenue_week), '[]'::jsonb),
    'revenue_month', coalesce((select jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency) from revenue_month), '[]'::jsonb),
    'revenue_total', coalesce((select jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency) from revenue_total), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.affiliate_record_click(text,uuid,uuid,text,text,text,text,text,uuid,uuid,text,timestamptz) from public, authenticated;
revoke all on function public.affiliate_record_postback_audit(text,text,text,text,integer,text,jsonb,text,text,text,uuid,text,text) from public, authenticated;
revoke all on function public.affiliate_record_conversion(text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamptz,timestamptz,jsonb,text,integer) from public, authenticated;
revoke all on function public.telemetry_cockpit_snapshot(text,integer) from public, authenticated;

grant execute on function public.affiliate_record_click(text,uuid,uuid,text,text,text,text,text,uuid,uuid,text,timestamptz) to anon;
grant execute on function public.affiliate_record_postback_audit(text,text,text,text,integer,text,jsonb,text,text,text,uuid,text,text) to anon;
grant execute on function public.affiliate_record_conversion(text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamptz,timestamptz,jsonb,text,integer) to anon;
grant execute on function public.telemetry_cockpit_snapshot(text,integer) to anon;

comment on table public.affiliate_clicks is 'Identificadores internos de cliques afiliados, vinculados à telemetria original.';
comment on table public.affiliate_conversions is 'Estado financeiro canônico por transação de rede afiliada.';
comment on table public.affiliate_conversion_events is 'Histórico append-only das mudanças financeiras recebidas por postback.';
comment on table public.affiliate_postback_audit is 'Auditoria append-only de toda tentativa de postback, inclusive rejeições e duplicatas.';
