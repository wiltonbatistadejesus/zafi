create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.telemetry_secret_valid(p_secret text)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select (
    session_user = 'postgres'
    and coalesce(p_secret, '') = '__zafi_internal_scheduler__'
  ) or extensions.digest(coalesce(p_secret, ''), 'sha256') = decode(
    'a7a2227f676beedb8898c210fe894dc7aa5becf0b2e3e4640b2b3127157f69f6',
    'hex'
  );
$$;

revoke all on function public.telemetry_secret_valid(text) from public, anon, authenticated;

alter table public.telemetry_deliveries
  drop constraint if exists telemetry_deliveries_status_check;

alter table public.telemetry_deliveries
  add constraint telemetry_deliveries_status_check
  check (status in ('accepted', 'sent', 'confirmed', 'skipped_no_consent', 'not_configured', 'failed'));

create table public.ga4_processing_confirmations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.telemetry_events(id),
  evidence_source text not null check (evidence_source in ('realtime', 'debugview')),
  measurement_id text not null check (measurement_id ~ '^G-[A-Z0-9]+$'),
  event_name text not null,
  evidence_at timestamptz not null,
  details jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  unique (event_id, evidence_source, measurement_id)
);

create index ga4_processing_confirmations_evidence_idx
  on public.ga4_processing_confirmations (evidence_source, evidence_at desc);

alter table public.ga4_processing_confirmations enable row level security;
revoke all on table public.ga4_processing_confirmations from public, anon, authenticated;
create policy ga4_processing_confirmations_deny_direct
  on public.ga4_processing_confirmations as restrictive for all to anon, authenticated
  using (false) with check (false);

create trigger ga4_processing_confirmations_append_only
before update or delete on public.ga4_processing_confirmations
for each row execute function public.telemetry_block_mutation();

create or replace function public.telemetry_record_ga4_confirmation(
  p_secret text,
  p_event_id uuid,
  p_evidence_source text,
  p_measurement_id text,
  p_event_name text,
  p_evidence_at timestamptz,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_expected_event_name text;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if p_evidence_source not in ('realtime', 'debugview') then
    raise exception 'invalid GA4 evidence source';
  end if;
  if p_measurement_id <> 'G-ZY4276HJZT' then
    raise exception 'confirmation does not belong to the official Zafi stream';
  end if;

  select event_type into v_expected_event_name
  from public.telemetry_events where id = p_event_id;
  if v_expected_event_name is null then
    raise exception 'telemetry event not found';
  end if;
  if p_event_name <> v_expected_event_name then
    raise exception 'GA4 evidence event name mismatch';
  end if;

  insert into public.ga4_processing_confirmations (
    event_id, evidence_source, measurement_id, event_name, evidence_at, details
  ) values (
    p_event_id, p_evidence_source, p_measurement_id, p_event_name,
    coalesce(p_evidence_at, now()), coalesce(p_details, '{}'::jsonb)
  )
  on conflict (event_id, evidence_source, measurement_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.ga4_processing_confirmations
    where event_id = p_event_id
      and evidence_source = p_evidence_source
      and measurement_id = p_measurement_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.telemetry_record_ga4_confirmation(text, uuid, text, text, text, timestamptz, jsonb)
  from public, authenticated;
grant execute on function public.telemetry_record_ga4_confirmation(text, uuid, text, text, text, timestamptz, jsonb)
  to anon;

create or replace function public.telemetry_ga4_integration_status(
  p_secret text,
  p_measurement_id text,
  p_confirmation_window_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz;
  v_realtime_count bigint;
  v_debugview_count bigint;
  v_technical_sent bigint;
  v_failed bigint;
  v_last_confirmation timestamptz;
  v_last_attempt timestamptz;
  v_status text;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if p_confirmation_window_hours < 1 or p_confirmation_window_hours > 720 then
    raise exception 'invalid confirmation window';
  end if;
  v_since := now() - make_interval(hours => p_confirmation_window_hours);

  select
    count(*) filter (where evidence_source = 'realtime'),
    count(*) filter (where evidence_source = 'debugview'),
    max(evidence_at)
  into v_realtime_count, v_debugview_count, v_last_confirmation
  from public.ga4_processing_confirmations
  where measurement_id = 'G-ZY4276HJZT' and evidence_at >= v_since;

  with latest as (
    select distinct on (event_id) event_id, status, attempted_at
    from public.telemetry_deliveries
    where provider = 'ga4' and attempted_at >= v_since
    order by event_id, attempted_at desc
  )
  select
    count(*) filter (where status in ('accepted', 'sent', 'confirmed')),
    count(*) filter (where status in ('failed', 'not_configured')),
    max(attempted_at)
  into v_technical_sent, v_failed, v_last_attempt
  from latest;

  v_status := case
    when coalesce(p_measurement_id, '') <> 'G-ZY4276HJZT' then 'not_integrated'
    when v_realtime_count > 0 and v_debugview_count > 0 then 'integrated'
    else 'attention'
  end;

  return jsonb_build_object(
    'status', v_status,
    'official_measurement_id', 'G-ZY4276HJZT',
    'configured_measurement_id_matches', coalesce(p_measurement_id, '') = 'G-ZY4276HJZT',
    'window_hours', p_confirmation_window_hours,
    'technical_sent', coalesce(v_technical_sent, 0),
    'failed', coalesce(v_failed, 0),
    'realtime_confirmed', coalesce(v_realtime_count, 0),
    'debugview_confirmed', coalesce(v_debugview_count, 0),
    'last_attempt_at', v_last_attempt,
    'last_confirmation_at', v_last_confirmation
  );
end;
$$;

revoke all on function public.telemetry_ga4_integration_status(text, text, integer)
  from public, authenticated;
grant execute on function public.telemetry_ga4_integration_status(text, text, integer)
  to anon;

create table public.operational_monitor_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  trigger_source text not null check (trigger_source in ('supabase_cron', 'manual')),
  status text not null check (status in ('success', 'failed')),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  snapshot_id uuid references public.operational_monitor_snapshots(id),
  snapshot_key text,
  error_code text,
  detail text,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now()
);

create index operational_monitor_runs_status_created_idx
  on public.operational_monitor_runs (status, created_at desc);
create index operational_monitor_runs_snapshot_idx
  on public.operational_monitor_runs (snapshot_id)
  where snapshot_id is not null;

alter table public.operational_monitor_runs enable row level security;
revoke all on table public.operational_monitor_runs from public, anon, authenticated;
create policy operational_monitor_runs_deny_direct
  on public.operational_monitor_runs as restrictive for all to anon, authenticated
  using (false) with check (false);

create trigger operational_monitor_runs_append_only
before update or delete on public.operational_monitor_runs
for each row execute function public.telemetry_block_mutation();

create or replace function public.operational_monitor_run_scheduled()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_bucket timestamptz;
  v_run_key text;
  v_snapshot jsonb;
  v_run_id uuid;
  v_error_code text;
  v_error_detail text;
begin
  if session_user <> 'postgres' then
    raise exception 'scheduled monitor is restricted to the database scheduler' using errcode = '42501';
  end if;

  v_bucket := date_trunc('hour', now())
    + make_interval(mins => (extract(minute from now())::integer / 5) * 5);
  v_run_key := 'oe0051:5m:' || to_char(v_bucket at time zone 'UTC', 'YYYYMMDDHH24MI');

  if exists (select 1 from public.operational_monitor_runs where run_key = v_run_key) then
    select id into v_run_id from public.operational_monitor_runs where run_key = v_run_key;
    return v_run_id;
  end if;

  begin
    v_snapshot := public.operational_monitor_snapshot('__zafi_internal_scheduler__', 24, true);
    insert into public.operational_monitor_runs (
      run_key, trigger_source, status, started_at, completed_at,
      snapshot_id, snapshot_key, detail
    ) values (
      v_run_key, 'supabase_cron', 'success', v_started_at, clock_timestamp(),
      nullif(v_snapshot->>'snapshot_id', '')::uuid,
      v_snapshot->>'snapshot_key',
      'Snapshot operacional criado automaticamente pelo Supabase Cron.'
    )
    on conflict (run_key) do nothing
    returning id into v_run_id;
  exception when others then
    get stacked diagnostics v_error_code = returned_sqlstate, v_error_detail = message_text;
    insert into public.operational_monitor_runs (
      run_key, trigger_source, status, started_at, completed_at, error_code, detail
    ) values (
      v_run_key, 'supabase_cron', 'failed', v_started_at, clock_timestamp(),
      left(v_error_code, 100), left(v_error_detail, 1000)
    )
    on conflict (run_key) do nothing
    returning id into v_run_id;
  end;

  if v_run_id is null then
    select id into v_run_id from public.operational_monitor_runs where run_key = v_run_key;
  end if;
  return v_run_id;
end;
$$;

revoke all on function public.operational_monitor_run_scheduled() from public, anon, authenticated;
grant execute on function public.operational_monitor_run_scheduled() to postgres;

create or replace function public.operational_monitor_latest(
  p_secret text,
  p_window_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot public.operational_monitor_snapshots%rowtype;
  v_last_run public.operational_monitor_runs%rowtype;
  v_last_success timestamptz;
  v_last_failure timestamptz;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;

  select * into v_snapshot from public.operational_monitor_snapshots
  where extract(epoch from (window_ended_at - window_started_at)) / 3600 = p_window_hours
  order by created_at desc limit 1;
  if v_snapshot.id is null then
    raise exception 'operational snapshot is not available yet';
  end if;

  select * into v_last_run from public.operational_monitor_runs order by created_at desc limit 1;
  select max(completed_at) into v_last_success from public.operational_monitor_runs where status = 'success';
  select max(completed_at) into v_last_failure from public.operational_monitor_runs where status = 'failed';

  return jsonb_build_object(
    'schema_version', v_snapshot.schema_version,
    'snapshot_id', v_snapshot.id,
    'snapshot_key', v_snapshot.snapshot_key,
    'generated_at', v_snapshot.created_at,
    'window_started_at', v_snapshot.window_started_at,
    'window_ended_at', v_snapshot.window_ended_at,
    'window_hours', p_window_hours,
    'overall_status', v_snapshot.overall_status,
    'health_score', v_snapshot.health_score,
    'has_activity', coalesce((v_snapshot.chain->0->>'count')::bigint, 0) > 0
      or coalesce((v_snapshot.chain->1->>'count')::bigint, 0) > 0
      or coalesce((v_snapshot.chain->2->>'count')::bigint, 0) > 0
      or coalesce((v_snapshot.chain->3->>'count')::bigint, 0) > 0
      or coalesce((v_snapshot.chain->4->>'count')::bigint, 0) > 0
      or coalesce((v_snapshot.chain->5->>'count')::bigint, 0) > 0,
    'chain', v_snapshot.chain,
    'quality', v_snapshot.quality,
    'diagnostics', v_snapshot.diagnostics,
    'reconciliation', v_snapshot.reconciliation,
    'scheduler', jsonb_build_object(
      'status', case
        when v_last_run.id is null then 'not_started'
        when v_last_run.status = 'failed' then 'failed'
        when v_last_run.completed_at < now() - interval '10 minutes' then 'stale'
        else 'healthy'
      end,
      'frequency', 'every_5_minutes',
      'last_run_at', v_last_run.completed_at,
      'last_success_at', v_last_success,
      'last_failure_at', v_last_failure,
      'last_error_code', v_last_run.error_code,
      'last_detail', v_last_run.detail
    )
  );
end;
$$;

revoke all on function public.operational_monitor_latest(text, integer) from public, authenticated;
grant execute on function public.operational_monitor_latest(text, integer) to anon;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'zafi-operational-monitor-5m';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'zafi-operational-monitor-5m',
    '*/5 * * * *',
    'select public.operational_monitor_run_scheduled();'
  );
end;
$$;

comment on table public.ga4_processing_confirmations is
  'Evidências auditáveis de processamento visual no Realtime e DebugView do fluxo oficial da Zafi.';
comment on table public.operational_monitor_runs is
  'Auditoria append-only das execuções automáticas do monitor operacional OE-005.1.';
