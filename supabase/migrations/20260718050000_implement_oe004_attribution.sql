alter table public.affiliate_conversions drop constraint if exists affiliate_conversions_status_check;
alter table public.affiliate_conversions add constraint affiliate_conversions_status_check
  check (status in ('pending', 'approved', 'paid', 'rejected', 'cancelled'));

alter table public.affiliate_conversion_events drop constraint if exists affiliate_conversion_events_status_check;
alter table public.affiliate_conversion_events add constraint affiliate_conversion_events_status_check
  check (status in ('pending', 'approved', 'paid', 'rejected', 'cancelled'));

alter table public.affiliate_clicks
  add column recommendation_run_id uuid references public.recommendation_runs(id) on delete restrict,
  add column recommendation_decision_id uuid references public.recommendation_decisions(id) on delete restrict;

do $$
begin
  if exists (select 1 from public.affiliate_clicks where recommendation_run_id is null or recommendation_decision_id is null) then
    raise exception 'OE-004 requires every existing affiliate click to be reconciled before migration';
  end if;
end;
$$;

alter table public.affiliate_clicks
  alter column recommendation_run_id set not null,
  alter column recommendation_decision_id set not null;

alter table public.affiliate_conversions
  add column recommendation_run_id uuid references public.recommendation_runs(id) on delete restrict,
  add column recommendation_decision_id uuid references public.recommendation_decisions(id) on delete restrict;

create table public.recommendation_attribution_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('impression', 'click', 'conversion')),
  run_id uuid not null references public.recommendation_runs(id) on delete restrict,
  decision_id uuid not null references public.recommendation_decisions(id) on delete restrict,
  product_id uuid not null references public.atlas_products(id) on delete restrict,
  partner_id uuid not null references public.atlas_partners(id) on delete restrict,
  campaign_id uuid references public.atlas_campaigns(id) on delete restrict,
  source_id uuid not null,
  idempotency_key text not null unique,
  financial_state text not null default 'none'
    check (financial_state in ('none', 'created', 'approved', 'paid', 'reversed')),
  amount numeric(14,4) check (amount is null or amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  schema_version integer not null default 1 check (schema_version > 0),
  unique (event_type, decision_id, source_id),
  check ((financial_state = 'none' and amount is null and currency is null)
    or financial_state <> 'none')
);

create index affiliate_clicks_recommendation_run_idx on public.affiliate_clicks (recommendation_run_id, occurred_at desc);
create index affiliate_clicks_recommendation_decision_idx on public.affiliate_clicks (recommendation_decision_id, occurred_at desc);
create index affiliate_conversions_recommendation_run_idx on public.affiliate_conversions (recommendation_run_id, last_event_at desc)
  where recommendation_run_id is not null;
create index affiliate_conversions_recommendation_decision_idx on public.affiliate_conversions (recommendation_decision_id, last_event_at desc)
  where recommendation_decision_id is not null;
create index recommendation_attribution_run_occurred_idx on public.recommendation_attribution_events (run_id, occurred_at desc);
create index recommendation_attribution_decision_occurred_idx on public.recommendation_attribution_events (decision_id, occurred_at desc);
create index recommendation_attribution_product_occurred_idx on public.recommendation_attribution_events (product_id, occurred_at desc);
create index recommendation_attribution_campaign_occurred_idx on public.recommendation_attribution_events (campaign_id, occurred_at desc)
  where campaign_id is not null;
create index recommendation_attribution_partner_type_occurred_idx on public.recommendation_attribution_events (partner_id, event_type, occurred_at desc);
create index recommendation_attribution_financial_state_idx on public.recommendation_attribution_events (financial_state, occurred_at desc)
  where event_type = 'conversion';

alter table public.recommendation_attribution_events enable row level security;
revoke all on table public.recommendation_attribution_events from anon, authenticated;
create policy recommendation_attribution_deny_direct on public.recommendation_attribution_events
  as restrictive for all to anon, authenticated using (false) with check (false);
create trigger recommendation_attribution_append_only before update or delete on public.recommendation_attribution_events
for each row execute function public.telemetry_block_mutation();

create or replace function private.recommendation_attribution_snapshot(
  p_run_id uuid,
  p_decision_id uuid,
  p_event jsonb
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'run', jsonb_build_object(
      'id', r.id,
      'engineVersion', r.engine_version,
      'atlasVersion', r.atlas_version,
      'profileSchemaVersion', r.profile_schema_version,
      'profileSnapshot', r.profile_snapshot,
      'experimentKey', r.experiment_key,
      'experimentVariant', r.experiment_variant,
      'createdAt', r.created_at
    ),
    'decision', d.decision_snapshot || jsonb_build_object(
      'id', d.id,
      'eligible', d.eligible,
      'score', d.score,
      'rank', d.rank,
      'recommendationReasons', d.recommendation_reasons,
      'exclusionReasons', d.exclusion_reasons,
      'appliedRules', d.applied_rules
    ),
    'event', coalesce(p_event, '{}'::jsonb)
  )
  from public.recommendation_runs r
  join public.recommendation_decisions d on d.run_id = r.id
  where r.id = p_run_id and d.id = p_decision_id;
$$;

revoke all on function private.recommendation_attribution_snapshot(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.recommendation_run(
  p_secret text,
  p_visitor_id uuid,
  p_session_id uuid,
  p_page_route text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
  v_run_id uuid;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid recommendation secret' using errcode = '42501';
  end if;

  v_result := private.recommendation_execute(p_visitor_id, p_session_id, p_page_route);
  v_run_id := (v_result->>'runId')::uuid;

  v_result := jsonb_set(v_result, '{recommendations}', coalesce((
    select jsonb_agg(item.value || jsonb_build_object('decisionId', d.id) order by (item.value->>'rank')::integer)
    from jsonb_array_elements(v_result->'recommendations') item(value)
    join public.recommendation_decisions d
      on d.run_id = v_run_id and d.decision_snapshot->>'id' = item.value->>'id'
  ), '[]'::jsonb));

  v_result := jsonb_set(v_result, '{exclusions}', coalesce((
    select jsonb_agg(item.value || jsonb_build_object('decisionId', d.id) order by item.value->>'id')
    from jsonb_array_elements(v_result->'exclusions') item(value)
    join public.recommendation_decisions d
      on d.run_id = v_run_id and d.decision_snapshot->>'id' = item.value->>'id'
  ), '[]'::jsonb));

  return v_result;
end;
$$;

revoke all on function public.recommendation_run(text, uuid, uuid, text) from public, authenticated;
grant execute on function public.recommendation_run(text, uuid, uuid, text) to anon;

create or replace function public.recommendation_record_impressions(
  p_secret text,
  p_run_id uuid,
  p_impression_id uuid,
  p_decision_ids uuid[],
  p_session_id uuid,
  p_visitor_id uuid,
  p_source_page text,
  p_occurred_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_run public.recommendation_runs%rowtype;
  v_expected integer;
  v_persisted integer;
  v_duplicate boolean;
  v_now timestamptz := coalesce(p_occurred_at, now());
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid recommendation secret' using errcode = '42501';
  end if;
  if coalesce(array_length(p_decision_ids, 1), 0) = 0 or array_length(p_decision_ids, 1) > 100 then
    raise exception 'invalid impression decisions';
  end if;
  if p_source_page is null or length(p_source_page) > 2048 then raise exception 'invalid impression source page'; end if;

  select * into v_run from public.recommendation_runs where id = p_run_id;
  if v_run.id is null or v_run.session_id <> p_session_id or v_run.visitor_id <> p_visitor_id then
    raise exception 'impression context mismatch';
  end if;

  select count(distinct d.id)::integer into v_expected
  from public.recommendation_decisions d
  where d.run_id = p_run_id and d.id = any(p_decision_ids) and d.eligible;
  if v_expected <> (select count(distinct value) from unnest(p_decision_ids) value) then
    raise exception 'impression decision mismatch';
  end if;

  select exists (
    select 1 from public.recommendation_attribution_events
    where event_type = 'impression' and source_id = p_impression_id and run_id = p_run_id
  ) into v_duplicate;

  insert into public.recommendation_attribution_events (
    event_type, run_id, decision_id, product_id, partner_id, campaign_id,
    source_id, idempotency_key, financial_state, snapshot, occurred_at
  )
  select
    'impression', d.run_id, d.id, d.product_id, d.partner_id, d.campaign_id,
    p_impression_id, 'impression:' || p_impression_id || ':' || d.id, 'none',
    private.recommendation_attribution_snapshot(d.run_id, d.id, jsonb_build_object(
      'type', 'impression', 'sourcePage', p_source_page, 'sessionId', p_session_id,
      'visitorId', p_visitor_id, 'impressionId', p_impression_id
    )),
    v_now
  from public.recommendation_decisions d
  where d.run_id = p_run_id and d.id = any(p_decision_ids) and d.eligible
  on conflict (idempotency_key) do nothing;

  select count(*)::integer into v_persisted
  from public.recommendation_attribution_events
  where event_type = 'impression' and source_id = p_impression_id and run_id = p_run_id;
  if v_persisted <> v_expected then raise exception 'impression persistence incomplete'; end if;

  return jsonb_build_object(
    'impressionId', p_impression_id,
    'runId', p_run_id,
    'decisionCount', v_persisted,
    'duplicate', v_duplicate,
    'persistedAt', now()
  );
end;
$$;

revoke all on function public.recommendation_record_impressions(text, uuid, uuid, uuid[], uuid, uuid, text, timestamptz) from public, authenticated;
grant execute on function public.recommendation_record_impressions(text, uuid, uuid, uuid[], uuid, uuid, text, timestamptz) to anon;

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
  p_occurred_at timestamptz,
  p_recommendation_run_id uuid,
  p_recommendation_decision_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_event public.telemetry_events%rowtype;
  v_click_id uuid;
  v_decision public.recommendation_decisions%rowtype;
  v_run public.recommendation_runs%rowtype;
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

  select * into v_run from public.recommendation_runs where id = p_recommendation_run_id;
  select * into v_decision from public.recommendation_decisions
    where id = p_recommendation_decision_id and run_id = p_recommendation_run_id;
  if v_run.id is null or v_decision.id is null or not v_decision.eligible
     or v_run.session_id <> p_session_id or v_run.visitor_id <> p_visitor_id
     or v_decision.decision_snapshot->>'partnerId' <> p_partner_id
     or coalesce(v_decision.decision_snapshot->>'campaignId', '') <> p_campaign_id then
    raise exception 'click recommendation attribution mismatch';
  end if;

  insert into public.affiliate_clicks (
    id, telemetry_event_id, partner_id, partner_name, campaign_id,
    campaign_name, network, session_id, visitor_id, source_page, occurred_at,
    recommendation_run_id, recommendation_decision_id
  ) values (
    p_click_id, p_telemetry_event_id, left(p_partner_id, 120), left(p_partner_name, 200),
    left(p_campaign_id, 120), left(p_campaign_name, 300), left(p_network, 80),
    p_session_id, p_visitor_id, left(p_source_page, 2048), coalesce(p_occurred_at, now()),
    p_recommendation_run_id, p_recommendation_decision_id
  )
  on conflict (telemetry_event_id) do nothing;

  select id into v_click_id from public.affiliate_clicks where telemetry_event_id = p_telemetry_event_id;

  insert into public.recommendation_attribution_events (
    event_type, run_id, decision_id, product_id, partner_id, campaign_id,
    source_id, idempotency_key, financial_state, snapshot, occurred_at
  ) values (
    'click', v_decision.run_id, v_decision.id, v_decision.product_id, v_decision.partner_id,
    v_decision.campaign_id, v_click_id, 'click:' || v_click_id, 'none',
    private.recommendation_attribution_snapshot(v_decision.run_id, v_decision.id, jsonb_build_object(
      'type', 'click', 'clickId', v_click_id, 'telemetryEventId', p_telemetry_event_id,
      'sourcePage', p_source_page, 'sessionId', p_session_id, 'visitorId', p_visitor_id,
      'partnerId', p_partner_id, 'campaignId', p_campaign_id
    )),
    coalesce(p_occurred_at, now())
  ) on conflict (idempotency_key) do nothing;

  return v_click_id;
end;
$$;

drop function if exists public.affiliate_record_click(text, uuid, uuid, text, text, text, text, text, uuid, uuid, text, timestamptz);
revoke all on function public.affiliate_record_click(text, uuid, uuid, text, text, text, text, text, uuid, uuid, text, timestamptz, uuid, uuid) from public, authenticated;
grant execute on function public.affiliate_record_click(text, uuid, uuid, text, text, text, text, text, uuid, uuid, text, timestamptz, uuid, uuid) to anon;

create or replace function private.affiliate_conversion_bind_recommendation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_click public.affiliate_clicks%rowtype;
begin
  if new.original_click_id is null then return new; end if;
  select * into v_click from public.affiliate_clicks where id = new.original_click_id;
  if v_click.id is null then return new; end if;
  if new.recommendation_run_id is not null and new.recommendation_run_id <> v_click.recommendation_run_id then
    raise exception 'conversion and recommendation run mismatch';
  end if;
  if new.recommendation_decision_id is not null and new.recommendation_decision_id <> v_click.recommendation_decision_id then
    raise exception 'conversion and recommendation decision mismatch';
  end if;
  new.recommendation_run_id := v_click.recommendation_run_id;
  new.recommendation_decision_id := v_click.recommendation_decision_id;
  return new;
end;
$$;

revoke all on function private.affiliate_conversion_bind_recommendation() from public, anon, authenticated;
create trigger affiliate_conversions_bind_recommendation
before insert or update of original_click_id on public.affiliate_conversions
for each row execute function private.affiliate_conversion_bind_recommendation();

create or replace function private.affiliate_conversion_attribute_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_conversion public.affiliate_conversions%rowtype;
  v_decision public.recommendation_decisions%rowtype;
  v_financial_state text;
begin
  select * into v_conversion from public.affiliate_conversions where id = new.conversion_id;
  if v_conversion.recommendation_decision_id is null or v_conversion.recommendation_run_id is null then return new; end if;
  select * into v_decision from public.recommendation_decisions where id = v_conversion.recommendation_decision_id;
  if v_decision.id is null or v_decision.run_id <> v_conversion.recommendation_run_id then
    raise exception 'conversion attribution decision mismatch';
  end if;

  v_financial_state := case new.status
    when 'pending' then 'created'
    when 'approved' then 'approved'
    when 'paid' then 'paid'
    else 'reversed'
  end;

  insert into public.recommendation_attribution_events (
    event_type, run_id, decision_id, product_id, partner_id, campaign_id,
    source_id, idempotency_key, financial_state, amount, currency, snapshot,
    occurred_at, schema_version
  ) values (
    'conversion', v_decision.run_id, v_decision.id, v_decision.product_id,
    v_decision.partner_id, v_decision.campaign_id, new.id,
    'conversion:' || new.id, v_financial_state, new.commission, new.currency,
    private.recommendation_attribution_snapshot(v_decision.run_id, v_decision.id, jsonb_build_object(
      'type', 'conversion', 'conversionId', v_conversion.id, 'conversionEventId', new.id,
      'transactionId', new.transaction_id, 'clickId', v_conversion.original_click_id,
      'status', new.status, 'financialState', v_financial_state,
      'commission', new.commission, 'currency', new.currency,
      'eventAt', new.event_at, 'receivedAt', new.received_at,
      'rawPayloadHash', new.raw_payload_hash
    )),
    new.event_at, v_conversion.schema_version
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

revoke all on function private.affiliate_conversion_attribute_event() from public, anon, authenticated;
create trigger affiliate_conversion_events_attribute_recommendation
after insert on public.affiliate_conversion_events
for each row execute function private.affiliate_conversion_attribute_event();

do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('public.affiliate_record_conversion(text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamptz,timestamptz,jsonb,text,integer)'::regprocedure)
    into v_definition;
  v_definition := replace(v_definition,
    $$p_status not in ('pending', 'approved', 'rejected', 'cancelled')$$,
    $$p_status not in ('pending', 'approved', 'paid', 'rejected', 'cancelled')$$);
  v_definition := replace(v_definition,
    $$p_status = 'approved' and (p_commission is null or p_currency is null)$$,
    $$p_status in ('approved', 'paid') and (p_commission is null or p_currency is null)$$);
  if position($$p_status not in ('pending', 'approved', 'rejected', 'cancelled')$$ in v_definition) > 0
     or position($$p_status in ('approved', 'paid')$$ in v_definition) = 0 then
    raise exception 'affiliate conversion paid-state patch failed';
  end if;
  execute v_definition;
end;
$migration$;

do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('public.telemetry_cockpit_snapshot(text,integer)'::regprocedure) into v_definition;
  v_definition := replace(v_definition, $$status = 'approved'$$, $$status in ('approved', 'paid')$$);
  execute v_definition;
end;
$migration$;

create or replace view public.recommendation_attribution_funnel_daily
with (security_invoker = true)
as
select
  (e.occurred_at at time zone 'America/Sao_Paulo')::date metric_date,
  e.run_id,
  e.decision_id,
  e.product_id,
  e.partner_id,
  e.campaign_id,
  count(*) filter (where e.event_type = 'impression')::bigint impressions,
  count(*) filter (where e.event_type = 'click')::bigint clicks,
  count(distinct e.snapshot #>> '{event,conversionId}') filter (where e.event_type = 'conversion')::bigint conversions,
  count(distinct e.snapshot #>> '{event,conversionId}') filter (where e.event_type = 'conversion' and e.financial_state = 'approved')::bigint approved_conversions,
  count(distinct e.snapshot #>> '{event,conversionId}') filter (where e.event_type = 'conversion' and e.financial_state = 'paid')::bigint paid_conversions
from public.recommendation_attribution_events e
group by 1, e.run_id, e.decision_id, e.product_id, e.partner_id, e.campaign_id;

create or replace view public.recommendation_attribution_finance_current
with (security_invoker = true)
as
select
  c.recommendation_run_id run_id,
  c.recommendation_decision_id decision_id,
  d.product_id,
  d.partner_id,
  d.campaign_id,
  c.currency,
  count(*) filter (where c.status in ('pending', 'approved', 'paid'))::bigint created_count,
  count(*) filter (where c.status in ('approved', 'paid'))::bigint approved_count,
  count(*) filter (where c.status = 'paid')::bigint paid_count,
  coalesce(sum(c.commission) filter (where c.status in ('pending', 'approved', 'paid')), 0)::numeric(16,4) revenue_created,
  coalesce(sum(c.commission) filter (where c.status in ('approved', 'paid')), 0)::numeric(16,4) revenue_approved,
  coalesce(sum(c.commission) filter (where c.status = 'paid'), 0)::numeric(16,4) revenue_paid
from public.affiliate_conversions c
join public.recommendation_decisions d on d.id = c.recommendation_decision_id
where c.recommendation_run_id is not null and c.recommendation_decision_id is not null
group by c.recommendation_run_id, c.recommendation_decision_id, d.product_id, d.partner_id, d.campaign_id, c.currency;

revoke all on table public.recommendation_attribution_funnel_daily,
  public.recommendation_attribution_finance_current from anon, authenticated;

create or replace function public.recommendation_attribution_cockpit_snapshot(
  p_secret text,
  p_recent_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid attribution secret' using errcode = '42501';
  end if;

  with event_totals as (
    select
      count(*) filter (where event_type = 'impression' and occurred_at >= v_start)::bigint impressions_today,
      count(*) filter (where event_type = 'impression')::bigint impressions_total,
      count(*) filter (where event_type = 'click' and occurred_at >= v_start)::bigint clicks_today,
      count(*) filter (where event_type = 'click')::bigint clicks_total,
      count(distinct snapshot #>> '{event,conversionId}') filter (where event_type = 'conversion' and occurred_at >= v_start)::bigint conversions_today,
      count(distinct snapshot #>> '{event,conversionId}') filter (where event_type = 'conversion')::bigint conversions_total
    from public.recommendation_attribution_events
  ), finance_totals as (
    select
      coalesce(sum(created_count), 0)::bigint created_count,
      coalesce(sum(approved_count), 0)::bigint approved_count,
      coalesce(sum(paid_count), 0)::bigint paid_count
    from public.recommendation_attribution_finance_current
  ), finance_created as (
    select currency, sum(revenue_created) value
    from public.recommendation_attribution_finance_current where currency is not null
    group by currency
  ), finance_approved as (
    select currency, sum(revenue_approved) value
    from public.recommendation_attribution_finance_current where currency is not null
    group by currency
  ), finance_paid as (
    select currency, sum(revenue_paid) value
    from public.recommendation_attribution_finance_current where currency is not null
    group by currency
  ), decision_events as (
    select
      e.decision_id,
      count(*) filter (where e.event_type = 'impression')::bigint impressions,
      count(*) filter (where e.event_type = 'click')::bigint clicks,
      count(distinct e.snapshot #>> '{event,conversionId}') filter (where e.event_type = 'conversion')::bigint conversions
    from public.recommendation_attribution_events e
    group by e.decision_id
  ), decision_finance as (
    select decision_id, currency, sum(revenue_approved) revenue_approved, sum(revenue_paid) revenue_paid
    from public.recommendation_attribution_finance_current
    group by decision_id, currency
  ), top_decisions as (
    select
      d.id decision_id,
      d.run_id,
      d.decision_snapshot->>'id' product_slug,
      d.decision_snapshot->>'productName' product_name,
      d.decision_snapshot->>'partnerId' partner_slug,
      d.decision_snapshot->>'name' partner_name,
      coalesce(de.impressions, 0) impressions,
      coalesce(de.clicks, 0) clicks,
      coalesce(de.conversions, 0) conversions,
      df.currency,
      coalesce(df.revenue_approved, 0) revenue_approved,
      coalesce(df.revenue_paid, 0) revenue_paid
    from public.recommendation_decisions d
    join decision_events de on de.decision_id = d.id
    left join decision_finance df on df.decision_id = d.id
    order by de.conversions desc, de.clicks desc, de.impressions desc, d.created_at desc
    limit 8
  ), recent as (
    select
      e.id, e.event_type, e.run_id, e.decision_id, e.source_id,
      e.financial_state, e.amount, e.currency, e.occurred_at, e.created_at,
      e.snapshot #>> '{decision,id}' product_slug,
      e.snapshot #>> '{decision,productName}' product_name,
      e.snapshot #>> '{decision,partnerId}' partner_slug,
      e.snapshot #>> '{decision,name}' partner_name,
      e.snapshot #>> '{event,transactionId}' transaction_id
    from public.recommendation_attribution_events e
    order by e.created_at desc
    limit greatest(1, least(coalesce(p_recent_limit, 20), 100))
  )
  select jsonb_build_object(
    'generated_at', now(),
    'impressions_today', et.impressions_today,
    'impressions_total', et.impressions_total,
    'clicks_today', et.clicks_today,
    'clicks_total', et.clicks_total,
    'conversions_today', et.conversions_today,
    'conversions_total', et.conversions_total,
    'affiliate_clicks_total', (select count(*) from public.affiliate_clicks),
    'affiliate_conversions_total', (select count(*) from public.affiliate_conversions),
    'unattributed_conversions_total', (select count(*) from public.affiliate_conversions where recommendation_decision_id is null),
    'created_count', ft.created_count,
    'approved_count', ft.approved_count,
    'paid_count', ft.paid_count,
    'revenue_created', coalesce((select jsonb_agg(to_jsonb(fc) order by currency) from finance_created fc), '[]'::jsonb),
    'revenue_approved', coalesce((select jsonb_agg(to_jsonb(fa) order by currency) from finance_approved fa), '[]'::jsonb),
    'revenue_paid', coalesce((select jsonb_agg(to_jsonb(fp) order by currency) from finance_paid fp), '[]'::jsonb),
    'top_decisions', coalesce((select jsonb_agg(to_jsonb(td) order by conversions desc, clicks desc, impressions desc) from top_decisions td), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(to_jsonb(re) order by created_at desc) from recent re), '[]'::jsonb)
  ) into v_result
  from event_totals et cross join finance_totals ft;

  return v_result;
end;
$$;

revoke all on function public.recommendation_attribution_cockpit_snapshot(text, integer) from public, authenticated;
grant execute on function public.recommendation_attribution_cockpit_snapshot(text, integer) to anon;

comment on table public.recommendation_attribution_events is 'Livro-razão append-only da OE-004: impressão, clique e conversão ligados à execução e decisão.';
comment on view public.recommendation_attribution_funnel_daily is 'Métricas diárias agregadas de impressão, clique e conversão por decisão.';
comment on view public.recommendation_attribution_finance_current is 'Estado financeiro atribuível atual, separado em receita criada, aprovada e paga.';
comment on function public.recommendation_attribution_cockpit_snapshot(text, integer) is 'Snapshot executivo auditável da atribuição OE-004.';
