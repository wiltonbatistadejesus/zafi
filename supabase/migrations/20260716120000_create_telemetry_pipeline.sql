create extension if not exists pgcrypto;

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'page_view',
    'analysis_started',
    'analysis_completed',
    'partner_clicked',
    'affiliate_click'
  )),
  session_id uuid not null,
  visitor_id uuid not null,
  occurred_at timestamptz not null,
  source_page text not null,
  source text not null default 'direct',
  consent text not null check (consent in ('granted', 'denied', 'unknown')),
  device jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version > 0),
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.telemetry_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.telemetry_events(id),
  provider text not null check (provider in ('ga4')),
  status text not null check (status in ('accepted', 'skipped_no_consent', 'not_configured', 'failed')),
  response_code integer,
  detail text,
  attempted_at timestamptz not null default now()
);

create index if not exists telemetry_events_type_created_idx
  on public.telemetry_events (event_type, created_at desc);
create index if not exists telemetry_events_session_created_idx
  on public.telemetry_events (session_id, created_at desc);
create index if not exists telemetry_events_visitor_created_idx
  on public.telemetry_events (visitor_id, created_at desc);
create index if not exists telemetry_events_source_page_idx
  on public.telemetry_events (source_page, created_at desc);
create index if not exists telemetry_deliveries_event_idx
  on public.telemetry_deliveries (event_id, attempted_at desc);

alter table public.telemetry_events enable row level security;
alter table public.telemetry_deliveries enable row level security;

revoke all on table public.telemetry_events from anon, authenticated;
revoke all on table public.telemetry_deliveries from anon, authenticated;

create or replace function public.telemetry_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'telemetry records are append-only';
end;
$$;

drop trigger if exists telemetry_events_append_only on public.telemetry_events;
create trigger telemetry_events_append_only
before update or delete on public.telemetry_events
for each row execute function public.telemetry_block_mutation();

drop trigger if exists telemetry_deliveries_append_only on public.telemetry_deliveries;
create trigger telemetry_deliveries_append_only
before update or delete on public.telemetry_deliveries
for each row execute function public.telemetry_block_mutation();

create or replace function public.telemetry_secret_valid(p_secret text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select extensions.digest(coalesce(p_secret, ''), 'sha256') = decode('a7a2227f676beedb8898c210fe894dc7aa5becf0b2e3e4640b2b3127157f69f6', 'hex');
$$;

revoke all on function public.telemetry_secret_valid(text) from public, anon, authenticated;

create or replace function public.telemetry_record_event(
  p_secret text,
  p_event_type text,
  p_session_id uuid,
  p_visitor_id uuid,
  p_occurred_at timestamptz,
  p_source_page text,
  p_source text,
  p_consent text,
  p_device jsonb,
  p_payload jsonb,
  p_schema_version integer,
  p_request_id text default null
)
returns table(event_id uuid, persisted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_created_at timestamptz;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;

  if p_event_type not in ('page_view', 'analysis_started', 'analysis_completed', 'partner_clicked', 'affiliate_click') then
    raise exception 'invalid event type';
  end if;
  if p_consent not in ('granted', 'denied', 'unknown') then
    raise exception 'invalid consent';
  end if;
  if length(p_source_page) > 2048 or length(coalesce(p_source, '')) > 200 then
    raise exception 'telemetry context too large';
  end if;
  if octet_length(coalesce(p_payload, '{}'::jsonb)::text) > 16384
     or octet_length(coalesce(p_device, '{}'::jsonb)::text) > 4096 then
    raise exception 'telemetry payload too large';
  end if;
  if (
    select count(*)
    from public.telemetry_events
    where session_id = p_session_id
      and created_at >= now() - interval '1 minute'
  ) >= 60 then
    raise exception 'telemetry rate limit exceeded' using errcode = '54000';
  end if;

  insert into public.telemetry_events (
    event_type, session_id, visitor_id, occurred_at, source_page, source,
    consent, device, payload, schema_version, request_id
  ) values (
    p_event_type, p_session_id, p_visitor_id, coalesce(p_occurred_at, now()),
    left(p_source_page, 2048), left(coalesce(nullif(p_source, ''), 'direct'), 200),
    p_consent, coalesce(p_device, '{}'::jsonb), coalesce(p_payload, '{}'::jsonb),
    coalesce(p_schema_version, 1), left(p_request_id, 200)
  )
  returning id, created_at into v_event_id, v_created_at;

  return query select v_event_id, v_created_at;
end;
$$;

create or replace function public.telemetry_record_partner_click(
  p_secret text,
  p_session_id uuid,
  p_visitor_id uuid,
  p_occurred_at timestamptz,
  p_source_page text,
  p_source text,
  p_consent text,
  p_device jsonb,
  p_payload jsonb,
  p_schema_version integer,
  p_request_id text default null
)
returns table(partner_event_id uuid, affiliate_event_id uuid, persisted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_affiliate_id uuid;
  v_created_at timestamptz;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if p_consent not in ('granted', 'denied', 'unknown') then
    raise exception 'invalid consent';
  end if;
  if octet_length(coalesce(p_payload, '{}'::jsonb)::text) > 16384 then
    raise exception 'telemetry payload too large';
  end if;

  insert into public.telemetry_events (
    event_type, session_id, visitor_id, occurred_at, source_page, source,
    consent, device, payload, schema_version, request_id
  ) values (
    'partner_clicked', p_session_id, p_visitor_id, coalesce(p_occurred_at, now()),
    left(p_source_page, 2048), left(coalesce(nullif(p_source, ''), 'direct'), 200),
    p_consent, coalesce(p_device, '{}'::jsonb), coalesce(p_payload, '{}'::jsonb),
    coalesce(p_schema_version, 1), left(p_request_id, 200)
  ) returning id, created_at into v_partner_id, v_created_at;

  insert into public.telemetry_events (
    event_type, session_id, visitor_id, occurred_at, source_page, source,
    consent, device, payload, schema_version, request_id
  ) values (
    'affiliate_click', p_session_id, p_visitor_id, coalesce(p_occurred_at, now()),
    left(p_source_page, 2048), left(coalesce(nullif(p_source, ''), 'direct'), 200),
    p_consent, coalesce(p_device, '{}'::jsonb), coalesce(p_payload, '{}'::jsonb),
    coalesce(p_schema_version, 1), left(p_request_id, 200)
  ) returning id into v_affiliate_id;

  return query select v_partner_id, v_affiliate_id, v_created_at;
end;
$$;

create or replace function public.telemetry_record_delivery(
  p_secret text,
  p_event_id uuid,
  p_provider text,
  p_status text,
  p_response_code integer default null,
  p_detail text default null
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
  insert into public.telemetry_deliveries (event_id, provider, status, response_code, detail)
  values (p_event_id, p_provider, p_status, p_response_code, left(p_detail, 1000))
  returning id into v_id;
  return v_id;
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
  v_month timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;

  with today as (
    select * from public.telemetry_events where created_at >= v_start
  ), first_seen as (
    select visitor_id, min(created_at) first_at from public.telemetry_events group by visitor_id
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
    from public.telemetry_events e
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
    'month_analysis_completed', (select count(*) from public.telemetry_events where event_type = 'analysis_completed' and created_at >= v_month),
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

revoke all on function public.telemetry_record_event(text,text,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb,integer,text) from public, authenticated;
revoke all on function public.telemetry_record_partner_click(text,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb,integer,text) from public, authenticated;
revoke all on function public.telemetry_record_delivery(text,uuid,text,text,integer,text) from public, authenticated;
revoke all on function public.telemetry_cockpit_snapshot(text,integer) from public, authenticated;

grant execute on function public.telemetry_record_event(text,text,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb,integer,text) to anon;
grant execute on function public.telemetry_record_partner_click(text,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb,integer,text) to anon;
grant execute on function public.telemetry_record_delivery(text,uuid,text,text,integer,text) to anon;
grant execute on function public.telemetry_cockpit_snapshot(text,integer) to anon;

comment on table public.telemetry_events is 'Fonte oficial append-only dos eventos operacionais da Zafi.';
comment on table public.telemetry_deliveries is 'Auditoria append-only das tentativas de entrega dos eventos a provedores analíticos.';
