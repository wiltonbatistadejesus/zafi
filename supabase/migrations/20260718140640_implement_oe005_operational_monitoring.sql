-- Corrige a interrupção encontrada pela auditoria OE-005 na origem da cadeia.
-- Os nomes das colunas de retorno da função colidiam com ON CONFLICT (profile_id).
create or replace function public.profile_record_progress(
  p_secret text,
  p_stage text,
  p_visitor_id uuid,
  p_session_id uuid,
  p_full_name text default null,
  p_email text default null,
  p_total_debt numeric default null,
  p_monthly_income numeric default null,
  p_debt_count integer default null,
  p_debt_types text[] default null,
  p_creditors text[] default null,
  p_estimated_months integer default null,
  p_contact_consent text default null,
  p_policy_version text default null,
  p_source text default null
)
returns table(profile_id uuid, stage text, persisted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_profile_id uuid; v_now timestamptz := now();
begin
  if not public.telemetry_secret_valid(p_secret) then raise exception 'invalid telemetry secret' using errcode = '42501'; end if;
  if p_stage not in ('financial_context', 'identity_and_income') then raise exception 'invalid collection stage'; end if;
  if coalesce(array_length(p_debt_types, 1), 0) > 30 or coalesce(array_length(p_creditors, 1), 0) > 100 then raise exception 'profile arrays too large'; end if;
  v_profile_id := public.profile_upsert_root(p_visitor_id, p_session_id);

  if p_stage = 'financial_context' then
    if p_total_debt is null or p_total_debt < 0 or p_debt_count is null or p_debt_count < 1 then raise exception 'invalid financial context'; end if;
    insert into public.profile_financial_context (profile_id, total_debt, debt_count, debt_types, creditors)
    values (v_profile_id, p_total_debt, p_debt_count, p_debt_types, p_creditors)
    on conflict on constraint profile_financial_context_pkey do update set
      total_debt = excluded.total_debt, debt_count = excluded.debt_count,
      debt_types = excluded.debt_types, creditors = excluded.creditors, updated_at = v_now;
  else
    if length(trim(coalesce(p_full_name, ''))) < 2 or length(p_full_name) > 200 then raise exception 'invalid full name'; end if;
    if length(coalesce(p_email, '')) > 320 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid email'; end if;
    if p_monthly_income is null or p_monthly_income < 0 then raise exception 'invalid monthly income'; end if;
    if p_contact_consent not in ('granted', 'denied') then raise exception 'contact consent is required'; end if;

    insert into public.profile_identity (profile_id, full_name, email, locale)
    values (v_profile_id, trim(p_full_name), lower(trim(p_email)), 'pt-BR')
    on conflict on constraint profile_identity_pkey do update set
      full_name = excluded.full_name, email = excluded.email, locale = excluded.locale, updated_at = v_now;

    insert into public.profile_financial_context (profile_id, monthly_income, estimated_months)
    values (v_profile_id, p_monthly_income, p_estimated_months)
    on conflict on constraint profile_financial_context_pkey do update set
      monthly_income = excluded.monthly_income, estimated_months = excluded.estimated_months, updated_at = v_now;

    perform public.profile_record_consent(
      p_secret, p_visitor_id, p_session_id, 'relationship', p_contact_consent,
      coalesce(nullif(p_policy_version, ''), '2026-07-oe002'), coalesce(nullif(p_source, ''), 'analysis_final_step')
    );
  end if;

  perform public.profile_backfill_journey(v_profile_id, p_visitor_id);
  return query select v_profile_id, p_stage, v_now;
end;
$$;

revoke all on function public.profile_record_progress(text, text, uuid, uuid, text, text, numeric, numeric, integer, text[], text[], integer, text, text, text) from public;
grant execute on function public.profile_record_progress(text, text, uuid, uuid, text, text, numeric, numeric, integer, text[], text[], integer, text, text, text) to anon, authenticated;

create table public.operational_monitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null unique,
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  overall_status text not null check (overall_status in ('healthy', 'attention', 'critical', 'neutral')),
  health_score numeric(5,2) check (health_score is null or health_score between 0 and 100),
  chain jsonb not null check (jsonb_typeof(chain) = 'array'),
  quality jsonb not null check (jsonb_typeof(quality) = 'array'),
  diagnostics jsonb not null check (jsonb_typeof(diagnostics) = 'array'),
  reconciliation jsonb not null check (jsonb_typeof(reconciliation) = 'object'),
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now()
);

create index operational_monitor_status_created_idx
  on public.operational_monitor_snapshots (overall_status, created_at desc);

create index profile_financial_context_updated_idx
  on public.profile_financial_context (updated_at desc);

create index recommendation_attribution_source_type_idx
  on public.recommendation_attribution_events (source_id, event_type);

create index affiliate_postback_audit_outcome_received_idx
  on public.affiliate_postback_audit (outcome, received_at desc);

alter table public.operational_monitor_snapshots enable row level security;
revoke all on table public.operational_monitor_snapshots from public, anon, authenticated;
create policy operational_monitor_snapshots_deny_direct
  on public.operational_monitor_snapshots as restrictive for all to anon, authenticated
  using (false) with check (false);

create trigger operational_monitor_snapshots_append_only
before update or delete on public.operational_monitor_snapshots
for each row execute function public.telemetry_block_mutation();

create or replace view public.financial_reconciliation_current
with (security_invoker = true)
as
select
  c.id conversion_id,
  c.network,
  c.transaction_id,
  c.original_click_id,
  c.recommendation_run_id run_id,
  c.recommendation_decision_id decision_id,
  c.partner_id,
  c.partner_name,
  c.campaign_id,
  c.campaign_name,
  c.status,
  c.commission,
  c.currency,
  c.last_received_at,
  ce.id latest_conversion_event_id,
  ae.id latest_attribution_event_id,
  case c.status
    when 'pending' then 'created'
    when 'approved' then 'approved'
    when 'paid' then 'paid'
    else 'reversed'
  end expected_financial_state,
  ae.financial_state observed_financial_state,
  array_remove(array[
    case when c.original_click_id is null then 'missing_original_click' end,
    case when c.recommendation_run_id is null or c.recommendation_decision_id is null then 'missing_recommendation_attribution' end,
    case when c.original_click_id is not null and ac.id is null then 'original_click_not_found' end,
    case when c.recommendation_decision_id is not null and d.id is null then 'decision_not_found' end,
    case when ce.id is null then 'conversion_event_not_found' end,
    case when ce.id is not null and ae.id is null then 'attribution_event_not_found' end,
    case when ae.id is not null and ae.financial_state <> case c.status when 'pending' then 'created' when 'approved' then 'approved' when 'paid' then 'paid' else 'reversed' end then 'financial_state_mismatch' end,
    case when ae.id is not null and ae.amount is distinct from c.commission then 'commission_mismatch' end,
    case when ae.id is not null and ae.currency is distinct from c.currency then 'currency_mismatch' end,
    case when ac.id is not null and (ac.recommendation_run_id <> c.recommendation_run_id or ac.recommendation_decision_id <> c.recommendation_decision_id) then 'click_conversion_attribution_mismatch' end,
    case when d.id is not null and d.decision_snapshot->>'partnerId' is distinct from c.partner_id then 'partner_mismatch' end,
    case when d.id is not null and d.decision_snapshot->>'campaignId' is distinct from c.campaign_id then 'campaign_mismatch' end
  ], null)::text[] issue_codes,
  c.original_click_id is not null
    and ac.id is not null
    and c.recommendation_run_id is not null
    and c.recommendation_decision_id is not null
    and d.id is not null
    and ce.id is not null
    and ae.id is not null
    and ae.financial_state = case c.status when 'pending' then 'created' when 'approved' then 'approved' when 'paid' then 'paid' else 'reversed' end
    and ae.amount is not distinct from c.commission
    and ae.currency is not distinct from c.currency
    and ac.recommendation_run_id = c.recommendation_run_id
    and ac.recommendation_decision_id = c.recommendation_decision_id
    and d.decision_snapshot->>'partnerId' is not distinct from c.partner_id
    and d.decision_snapshot->>'campaignId' is not distinct from c.campaign_id
    as reconciled
from public.affiliate_conversions c
left join public.affiliate_clicks ac on ac.id = c.original_click_id
left join public.recommendation_decisions d on d.id = c.recommendation_decision_id
left join lateral (
  select e.*
  from public.affiliate_conversion_events e
  where e.conversion_id = c.id
  order by e.received_at desc, e.id desc
  limit 1
) ce on true
left join public.recommendation_attribution_events ae
  on ae.event_type = 'conversion' and ae.source_id = ce.id;

revoke all on table public.financial_reconciliation_current from public, anon, authenticated;

create or replace function public.operational_monitor_snapshot(
  p_secret text,
  p_window_hours integer default 24,
  p_persist boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_since timestamptz;
  v_bucket timestamptz;
  v_snapshot_key text;
  v_snapshot_id uuid;
  v_profiles bigint := 0;
  v_runs bigint := 0;
  v_runs_with_decisions bigint := 0;
  v_eligible_runs bigint := 0;
  v_runs_with_impressions bigint := 0;
  v_impressions bigint := 0;
  v_telemetry_clicks bigint := 0;
  v_clicks bigint := 0;
  v_click_ledger_events bigint := 0;
  v_conversions bigint := 0;
  v_attributed_conversions bigint := 0;
  v_reconciled_conversions bigint := 0;
  v_financial_conversions bigint := 0;
  v_journey_expected bigint := 0;
  v_journey_missing bigint := 0;
  v_ga4_expected bigint := 0;
  v_ga4_accepted bigint := 0;
  v_profiles_without_run bigint := 0;
  v_runs_without_decisions bigint := 0;
  v_runs_without_impressions bigint := 0;
  v_telemetry_clicks_without_click bigint := 0;
  v_clicks_without_ledger bigint := 0;
  v_unattributed_conversions bigint := 0;
  v_financial_mismatches bigint := 0;
  v_rejected_postbacks bigint := 0;
  v_stale_pending bigint := 0;
  v_postbacks_accepted bigint := 0;
  v_postbacks_duplicate bigint := 0;
  v_pending bigint := 0;
  v_approved bigint := 0;
  v_paid bigint := 0;
  v_reversed bigint := 0;
  v_critical bigint := 0;
  v_attention bigint := 0;
  v_has_activity boolean;
  v_overall_status text;
  v_health_score numeric(5,2);
  v_chain jsonb;
  v_quality jsonb;
  v_diagnostics jsonb := '[]'::jsonb;
  v_reconciliation jsonb;
  v_revenue_created jsonb;
  v_revenue_approved jsonb;
  v_revenue_paid jsonb;
  v_discrepancies jsonb;
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid operational monitor secret' using errcode = '42501';
  end if;
  if p_window_hours is null or p_window_hours < 1 or p_window_hours > 720 then
    raise exception 'monitor window must be between 1 and 720 hours';
  end if;

  v_since := v_now - make_interval(hours => p_window_hours);
  v_bucket := date_bin(interval '5 minutes', v_now, timestamptz '2000-01-01 00:00:00+00');
  v_snapshot_key := 'oe005:v1:' || p_window_hours || ':' || to_char(v_bucket at time zone 'UTC', 'YYYYMMDDHH24MI');

  select count(*) into v_profiles
  from public.profile_financial_context where updated_at >= v_since;

  select
    count(*),
    count(*) filter (where exists (select 1 from public.recommendation_decisions d where d.run_id = r.id)),
    count(*) filter (where exists (select 1 from public.recommendation_decisions d where d.run_id = r.id and d.eligible)),
    count(*) filter (where exists (select 1 from public.recommendation_attribution_events e where e.run_id = r.id and e.event_type = 'impression'))
  into v_runs, v_runs_with_decisions, v_eligible_runs, v_runs_with_impressions
  from public.recommendation_runs r where r.created_at >= v_since;

  select count(*) into v_impressions
  from public.recommendation_attribution_events
  where event_type = 'impression' and created_at >= v_since;

  select count(*) into v_telemetry_clicks
  from public.telemetry_events
  where event_type = 'partner_clicked' and created_at >= v_since;

  select
    count(*),
    count(*) filter (where exists (
      select 1 from public.recommendation_attribution_events e
      where e.event_type = 'click' and e.source_id = c.id
    ))
  into v_clicks, v_click_ledger_events
  from public.affiliate_clicks c where c.created_at >= v_since;

  select
    count(distinct ce.conversion_id),
    count(distinct ce.conversion_id) filter (where c.recommendation_decision_id is not null),
    count(distinct ce.conversion_id) filter (where fr.reconciled),
    count(distinct ce.conversion_id) filter (where c.status in ('approved', 'paid'))
  into v_conversions, v_attributed_conversions, v_reconciled_conversions, v_financial_conversions
  from public.affiliate_conversion_events ce
  join public.affiliate_conversions c on c.id = ce.conversion_id
  left join public.financial_reconciliation_current fr on fr.conversion_id = c.id
  where ce.received_at >= v_since;

  with expected as (
    select 'telemetry'::text source_kind, e.id source_id
    from public.telemetry_events e
    join public.smart_profiles p on p.visitor_id = e.visitor_id
    where e.created_at >= v_since
    union all
    select 'affiliate_conversion', ce.id
    from public.affiliate_conversion_events ce
    join public.affiliate_conversions c on c.id = ce.conversion_id
    join public.smart_profiles p on p.visitor_id = c.visitor_id
    where ce.received_at >= v_since
  )
  select count(*), count(*) filter (where j.id is null)
  into v_journey_expected, v_journey_missing
  from expected x
  left join public.profile_journey_events j
    on j.source_kind = x.source_kind and j.source_id = x.source_id;

  with granted as (
    select e.id
    from public.telemetry_events e
    where e.created_at >= v_since and e.consent = 'granted'
  ), latest as (
    select g.id, d.status
    from granted g
    left join lateral (
      select status from public.telemetry_deliveries td
      where td.event_id = g.id and td.provider = 'ga4'
      order by attempted_at desc limit 1
    ) d on true
  )
  select count(*), count(*) filter (where status = 'accepted')
  into v_ga4_expected, v_ga4_accepted from latest;

  select count(*) into v_profiles_without_run
  from public.profile_financial_context f
  where f.updated_at >= v_since and f.updated_at < v_now - interval '10 minutes'
    and not exists (
      select 1 from public.recommendation_runs r
      where r.profile_id = f.profile_id and r.created_at >= f.updated_at
    );

  select count(*) into v_runs_without_decisions
  from public.recommendation_runs r
  where r.created_at >= v_since and r.created_at < v_now - interval '1 minute'
    and not exists (select 1 from public.recommendation_decisions d where d.run_id = r.id);

  select count(*) into v_runs_without_impressions
  from public.recommendation_runs r
  where r.created_at >= v_since and r.created_at < v_now - interval '10 minutes'
    and exists (select 1 from public.recommendation_decisions d where d.run_id = r.id and d.eligible)
    and not exists (
      select 1 from public.recommendation_attribution_events e
      where e.run_id = r.id and e.event_type = 'impression'
    );

  select count(*) into v_telemetry_clicks_without_click
  from public.telemetry_events e
  where e.event_type = 'partner_clicked' and e.created_at >= v_since
    and not exists (select 1 from public.affiliate_clicks c where c.telemetry_event_id = e.id);

  select count(*) into v_clicks_without_ledger
  from public.affiliate_clicks c
  where c.created_at >= v_since
    and not exists (
      select 1 from public.recommendation_attribution_events e
      where e.event_type = 'click' and e.source_id = c.id
    );

  select count(*) into v_unattributed_conversions
  from public.affiliate_conversions c
  where c.last_received_at >= v_since
    and (c.recommendation_run_id is null or c.recommendation_decision_id is null);

  select count(*) into v_financial_mismatches
  from public.financial_reconciliation_current
  where last_received_at >= v_since
    and decision_id is not null and not reconciled;

  select
    count(*) filter (where outcome = 'accepted'),
    count(*) filter (where outcome = 'duplicate'),
    count(*) filter (where outcome = 'rejected')
  into v_postbacks_accepted, v_postbacks_duplicate, v_rejected_postbacks
  from public.affiliate_postback_audit where received_at >= v_since;

  select count(*) into v_stale_pending
  from public.affiliate_conversions
  where status = 'pending' and last_received_at < v_now - interval '7 days';

  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'paid'),
    count(*) filter (where status in ('rejected', 'cancelled'))
  into v_pending, v_approved, v_paid, v_reversed
  from public.affiliate_conversions where last_received_at >= v_since;

  if v_profiles_without_run > 0 then
    v_attention := v_attention + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'profile_without_recommendation', 'stage', 'engine', 'severity', 'attention',
      'title', 'Perfil concluído sem execução do motor', 'count', v_profiles_without_run,
      'detail', 'Contextos financeiros com mais de 10 minutos ainda não chegaram ao Recommendation Engine.'
    ));
  end if;
  if v_runs_without_decisions > 0 then
    v_critical := v_critical + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'run_without_decisions', 'stage', 'engine', 'severity', 'critical',
      'title', 'Execução sem decisões', 'count', v_runs_without_decisions,
      'detail', 'O motor persistiu a execução, mas não produziu decisões auditáveis.'
    ));
  end if;
  if v_runs_without_impressions > 0 then
    v_attention := v_attention + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'eligible_run_without_impression', 'stage', 'impression', 'severity', 'attention',
      'title', 'Recomendações não exibidas', 'count', v_runs_without_impressions,
      'detail', 'Execuções elegíveis com mais de 10 minutos não possuem impressão persistida.'
    ));
  end if;
  if v_telemetry_clicks_without_click > 0 or v_clicks_without_ledger > 0 then
    v_critical := v_critical + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'click_chain_break', 'stage', 'click', 'severity', 'critical',
      'title', 'Clique interrompido na cadeia', 'count', v_telemetry_clicks_without_click + v_clicks_without_ledger,
      'detail', 'Há cliques sem registro afiliado ou sem vínculo no livro-razão de atribuição.'
    ));
  end if;
  if v_unattributed_conversions > 0 then
    v_attention := v_attention + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'conversion_without_attribution', 'stage', 'conversion', 'severity', 'attention',
      'title', 'Conversão sem decisão de origem', 'count', v_unattributed_conversions,
      'detail', 'A conversão foi registrada, mas não possui evidência causal até o Recommendation Engine.'
    ));
  end if;
  if v_financial_mismatches > 0 then
    v_critical := v_critical + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'financial_reconciliation_mismatch', 'stage', 'revenue', 'severity', 'critical',
      'title', 'Divergência na conciliação financeira', 'count', v_financial_mismatches,
      'detail', 'Estado, valor, moeda ou vínculo do ledger diverge da conversão financeira atual.'
    ));
  end if;
  if v_rejected_postbacks > 0 then
    v_attention := v_attention + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'postback_rejected', 'stage', 'conversion', 'severity', 'attention',
      'title', 'Postback rejeitado', 'count', v_rejected_postbacks,
      'detail', 'A rede enviou postbacks que não passaram pela validação técnica ou de segurança.'
    ));
  end if;
  if v_journey_missing > 0 then
    v_critical := v_critical + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'profile_journey_gap', 'stage', 'profile', 'severity', 'critical',
      'title', 'Evento ausente na jornada do perfil', 'count', v_journey_missing,
      'detail', 'Eventos com perfil conhecido não foram vinculados automaticamente à Jornada.'
    ));
  end if;
  if v_ga4_expected > v_ga4_accepted then
    v_attention := v_attention + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'ga4_delivery_gap', 'stage', 'analytics', 'severity', 'attention',
      'title', 'Entrega analítica incompleta', 'count', v_ga4_expected - v_ga4_accepted,
      'detail', 'Eventos com consentimento concedido ainda não possuem confirmação de entrega ao GA4.'
    ));
  end if;
  if v_stale_pending > 0 then
    v_attention := v_attention + 1;
    v_diagnostics := v_diagnostics || jsonb_build_array(jsonb_build_object(
      'code', 'stale_pending_conversion', 'stage', 'revenue', 'severity', 'attention',
      'title', 'Conversão pendente há mais de 7 dias', 'count', v_stale_pending,
      'detail', 'Transações antigas aguardam aprovação, rejeição ou pagamento pela rede.'
    ));
  end if;

  v_has_activity := (
    v_profiles + v_runs + v_impressions + v_telemetry_clicks + v_clicks + v_conversions
    + v_postbacks_accepted + v_postbacks_duplicate + v_rejected_postbacks
  ) > 0;
  v_overall_status := case
    when v_critical > 0 then 'critical'
    when v_attention > 0 then 'attention'
    when not v_has_activity then 'neutral'
    else 'healthy'
  end;
  v_health_score := case when not v_has_activity then null
    else greatest(0, 100 - (v_critical * 25) - (v_attention * 10))::numeric(5,2) end;

  v_chain := jsonb_build_array(
    jsonb_build_object(
      'key', 'profile', 'label', 'Perfil', 'count', v_profiles,
      'status', case when v_journey_missing > 0 then 'critical' when v_profiles = 0 then 'neutral' else 'healthy' end,
      'coverage', case when v_profiles = 0 or v_journey_expected = 0 then null else round(((v_journey_expected - v_journey_missing)::numeric / v_journey_expected) * 100, 2) end,
      'detail', case when v_profiles = 0 then 'Nenhum contexto financeiro na janela.' else 'Contextos financeiros e Jornada vinculados.' end
    ),
    jsonb_build_object(
      'key', 'engine', 'label', 'Motor', 'count', v_runs,
      'status', case when v_runs_without_decisions > 0 then 'critical' when v_profiles_without_run > 0 then 'attention' when v_runs = 0 then 'neutral' else 'healthy' end,
      'coverage', case when v_profiles = 0 then null else round((least(v_runs, v_profiles)::numeric / v_profiles) * 100, 2) end,
      'detail', 'Execuções com decisões preservadas.'
    ),
    jsonb_build_object(
      'key', 'impression', 'label', 'Impressão', 'count', v_impressions,
      'status', case when v_runs_without_impressions > 0 then 'attention' when v_eligible_runs = 0 then 'neutral' else 'healthy' end,
      'coverage', case when v_eligible_runs = 0 then null else round((v_runs_with_impressions::numeric / v_eligible_runs) * 100, 2) end,
      'detail', 'Execuções elegíveis liberadas para exibição.'
    ),
    jsonb_build_object(
      'key', 'click', 'label', 'Clique', 'count', v_clicks,
      'status', case when v_telemetry_clicks_without_click > 0 or v_clicks_without_ledger > 0 then 'critical' when v_telemetry_clicks = 0 and v_clicks = 0 then 'neutral' else 'healthy' end,
      'coverage', case when v_clicks = 0 then null else round((v_click_ledger_events::numeric / v_clicks) * 100, 2) end,
      'detail', 'Cliques persistidos e ligados ao ledger.'
    ),
    jsonb_build_object(
      'key', 'conversion', 'label', 'Conversão', 'count', v_conversions,
      'status', case when v_unattributed_conversions > 0 or v_rejected_postbacks > 0 then 'attention' when v_conversions = 0 then 'neutral' else 'healthy' end,
      'coverage', case when v_conversions = 0 then null else round((v_attributed_conversions::numeric / v_conversions) * 100, 2) end,
      'detail', 'Conversões conectadas à decisão de origem.'
    ),
    jsonb_build_object(
      'key', 'revenue', 'label', 'Receita', 'count', v_financial_conversions,
      'status', case when v_financial_mismatches > 0 then 'critical' when v_stale_pending > 0 then 'attention' when v_financial_conversions = 0 then 'neutral' else 'healthy' end,
      'coverage', case when v_conversions = 0 then null else round((v_reconciled_conversions::numeric / v_conversions) * 100, 2) end,
      'detail', 'Estado, valor e moeda conciliados.'
    )
  );

  v_quality := jsonb_build_array(
    jsonb_build_object('key', 'profile_engine', 'label', 'Perfil → Motor', 'numerator', least(v_runs, v_profiles), 'denominator', v_profiles,
      'value', case when v_profiles = 0 then null else round((least(v_runs, v_profiles)::numeric / v_profiles) * 100, 2) end),
    jsonb_build_object('key', 'decision_integrity', 'label', 'Execuções com decisão', 'numerator', v_runs_with_decisions, 'denominator', v_runs,
      'value', case when v_runs = 0 then null else round((v_runs_with_decisions::numeric / v_runs) * 100, 2) end),
    jsonb_build_object('key', 'impression_coverage', 'label', 'Cobertura de impressão', 'numerator', v_runs_with_impressions, 'denominator', v_eligible_runs,
      'value', case when v_eligible_runs = 0 then null else round((v_runs_with_impressions::numeric / v_eligible_runs) * 100, 2) end),
    jsonb_build_object('key', 'click_integrity', 'label', 'Integridade dos cliques', 'numerator', v_click_ledger_events, 'denominator', v_clicks,
      'value', case when v_clicks = 0 then null else round((v_click_ledger_events::numeric / v_clicks) * 100, 2) end),
    jsonb_build_object('key', 'conversion_attribution', 'label', 'Atribuição das conversões', 'numerator', v_attributed_conversions, 'denominator', v_conversions,
      'value', case when v_conversions = 0 then null else round((v_attributed_conversions::numeric / v_conversions) * 100, 2) end),
    jsonb_build_object('key', 'financial_reconciliation', 'label', 'Conciliação financeira', 'numerator', v_reconciled_conversions, 'denominator', v_conversions,
      'value', case when v_conversions = 0 then null else round((v_reconciled_conversions::numeric / v_conversions) * 100, 2) end),
    jsonb_build_object('key', 'journey_integrity', 'label', 'Integridade da Jornada', 'numerator', v_journey_expected - v_journey_missing, 'denominator', v_journey_expected,
      'value', case when v_journey_expected = 0 then null else round(((v_journey_expected - v_journey_missing)::numeric / v_journey_expected) * 100, 2) end),
    jsonb_build_object('key', 'ga4_delivery', 'label', 'Entrega GA4 consentida', 'numerator', v_ga4_accepted, 'denominator', v_ga4_expected,
      'value', case when v_ga4_expected = 0 then null else round((v_ga4_accepted::numeric / v_ga4_expected) * 100, 2) end)
  );

  select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency), '[]'::jsonb)
  into v_revenue_created from (
    select currency, coalesce(sum(commission), 0) value
    from public.affiliate_conversions
    where last_received_at >= v_since and status in ('pending', 'approved', 'paid') and currency is not null
    group by currency
  ) x;
  select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency), '[]'::jsonb)
  into v_revenue_approved from (
    select currency, coalesce(sum(commission), 0) value
    from public.affiliate_conversions
    where last_received_at >= v_since and status in ('approved', 'paid') and currency is not null
    group by currency
  ) x;
  select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'value', value) order by currency), '[]'::jsonb)
  into v_revenue_paid from (
    select currency, coalesce(sum(commission), 0) value
    from public.affiliate_conversions
    where last_received_at >= v_since and status = 'paid' and currency is not null
    group by currency
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by last_received_at desc), '[]'::jsonb)
  into v_discrepancies from (
    select conversion_id, transaction_id, partner_name, status, expected_financial_state,
      observed_financial_state, issue_codes, last_received_at
    from public.financial_reconciliation_current
    where last_received_at >= v_since and not reconciled
    order by last_received_at desc limit 10
  ) x;

  v_reconciliation := jsonb_build_object(
    'total', v_conversions,
    'attributed', v_attributed_conversions,
    'reconciled', v_reconciled_conversions,
    'unreconciled', greatest(0, v_conversions - v_reconciled_conversions),
    'pending', v_pending,
    'approved', v_approved,
    'paid', v_paid,
    'reversed', v_reversed,
    'stale_pending', v_stale_pending,
    'postbacks_accepted', v_postbacks_accepted,
    'postbacks_duplicate', v_postbacks_duplicate,
    'postbacks_rejected', v_rejected_postbacks,
    'revenue_created', v_revenue_created,
    'revenue_approved', v_revenue_approved,
    'revenue_paid', v_revenue_paid,
    'discrepancies', v_discrepancies
  );

  v_result := jsonb_build_object(
    'schema_version', 1,
    'generated_at', v_now,
    'window_started_at', v_since,
    'window_ended_at', v_now,
    'window_hours', p_window_hours,
    'overall_status', v_overall_status,
    'health_score', v_health_score,
    'has_activity', v_has_activity,
    'chain', v_chain,
    'quality', v_quality,
    'diagnostics', v_diagnostics,
    'reconciliation', v_reconciliation
  );

  if p_persist then
    insert into public.operational_monitor_snapshots (
      snapshot_key, window_started_at, window_ended_at, overall_status, health_score,
      chain, quality, diagnostics, reconciliation, schema_version
    ) values (
      v_snapshot_key, v_since, v_now, v_overall_status, v_health_score,
      v_chain, v_quality, v_diagnostics, v_reconciliation, 1
    ) on conflict (snapshot_key) do nothing
    returning id into v_snapshot_id;

    if v_snapshot_id is null then
      select id into v_snapshot_id
      from public.operational_monitor_snapshots where snapshot_key = v_snapshot_key;
    end if;
  end if;

  return v_result || jsonb_build_object('snapshot_id', v_snapshot_id, 'snapshot_key', v_snapshot_key);
end;
$$;

revoke all on function public.operational_monitor_snapshot(text, integer, boolean) from public, authenticated;
grant execute on function public.operational_monitor_snapshot(text, integer, boolean) to anon;

comment on table public.operational_monitor_snapshots is 'Snapshots append-only e idempotentes da saúde operacional OE-005.';
comment on view public.financial_reconciliation_current is 'Conciliação auditável entre conversão, clique, decisão e estado financeiro do ledger.';
comment on function public.operational_monitor_snapshot(text, integer, boolean) is 'Diagnóstico OE-005 da cadeia Perfil → Motor → impressão → clique → conversão → receita.';
