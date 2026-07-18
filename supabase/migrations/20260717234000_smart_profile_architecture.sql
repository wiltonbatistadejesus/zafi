create table if not exists public.smart_profiles (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null unique,
  current_session_id uuid not null,
  status text not null default 'active' check (status in ('active', 'anonymized', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_identity (
  profile_id uuid primary key references public.smart_profiles(id),
  full_name text,
  email text,
  phone text,
  locale text,
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (full_name is null or length(full_name) between 2 and 200),
  check (email is null or length(email) <= 320),
  check (phone is null or length(phone) <= 30)
);

create table if not exists public.profile_consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.smart_profiles(id),
  purpose text not null check (purpose in ('analytics', 'relationship', 'personalization', 'partner_sharing')),
  status text not null check (status in ('granted', 'denied', 'withdrawn')),
  legal_basis text not null default 'consent' check (legal_basis in ('consent')),
  policy_version text not null,
  source text not null,
  session_id uuid not null,
  supersedes_id uuid references public.profile_consents(id),
  captured_at timestamptz not null default now(),
  schema_version integer not null default 1 check (schema_version > 0)
);

create table if not exists public.profile_financial_context (
  profile_id uuid primary key references public.smart_profiles(id),
  total_debt numeric(14,2) check (total_debt is null or total_debt >= 0),
  monthly_income numeric(14,2) check (monthly_income is null or monthly_income >= 0),
  debt_count integer check (debt_count is null or debt_count between 0 and 100),
  debt_types text[],
  creditors text[],
  estimated_months integer check (estimated_months is null or estimated_months between 1 and 1200),
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  schema_version integer not null default 1 check (schema_version > 0)
);

create table if not exists public.profile_journey_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.smart_profiles(id),
  event_name text not null,
  source_kind text not null check (source_kind in ('telemetry', 'affiliate_conversion')),
  source_id uuid not null,
  session_id uuid,
  source_page text,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  unique (source_kind, source_id)
);

create table if not exists public.profile_intelligence (
  profile_id uuid primary key references public.smart_profiles(id),
  score_zafi numeric(6,3),
  conversion_probability numeric(7,6) check (conversion_probability is null or conversion_probability between 0 and 1),
  interests text[],
  calculated_attributes jsonb,
  calculation_version text,
  calculated_at timestamptz,
  source_snapshot_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_consents_profile_purpose_idx
  on public.profile_consents (profile_id, purpose, captured_at desc);
create index if not exists profile_journey_profile_occurred_idx
  on public.profile_journey_events (profile_id, occurred_at desc);
create index if not exists profile_identity_email_idx
  on public.profile_identity (lower(email)) where email is not null;

alter table public.smart_profiles enable row level security;
alter table public.profile_identity enable row level security;
alter table public.profile_consents enable row level security;
alter table public.profile_financial_context enable row level security;
alter table public.profile_journey_events enable row level security;
alter table public.profile_intelligence enable row level security;

revoke all on table public.smart_profiles from anon, authenticated;
revoke all on table public.profile_identity from anon, authenticated;
revoke all on table public.profile_consents from anon, authenticated;
revoke all on table public.profile_financial_context from anon, authenticated;
revoke all on table public.profile_journey_events from anon, authenticated;
revoke all on table public.profile_intelligence from anon, authenticated;

create policy smart_profiles_deny_direct_access on public.smart_profiles as restrictive for all to anon, authenticated using (false) with check (false);
create policy profile_identity_deny_direct_access on public.profile_identity as restrictive for all to anon, authenticated using (false) with check (false);
create policy profile_consents_deny_direct_access on public.profile_consents as restrictive for all to anon, authenticated using (false) with check (false);
create policy profile_financial_context_deny_direct_access on public.profile_financial_context as restrictive for all to anon, authenticated using (false) with check (false);
create policy profile_journey_events_deny_direct_access on public.profile_journey_events as restrictive for all to anon, authenticated using (false) with check (false);
create policy profile_intelligence_deny_direct_access on public.profile_intelligence as restrictive for all to anon, authenticated using (false) with check (false);

drop trigger if exists profile_consents_append_only on public.profile_consents;
create trigger profile_consents_append_only before update or delete on public.profile_consents
for each row execute function public.telemetry_block_mutation();

drop trigger if exists profile_journey_events_append_only on public.profile_journey_events;
create trigger profile_journey_events_append_only before update or delete on public.profile_journey_events
for each row execute function public.telemetry_block_mutation();

create or replace function public.profile_upsert_root(p_visitor_id uuid, p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_profile_id uuid;
begin
  insert into public.smart_profiles (visitor_id, current_session_id)
  values (p_visitor_id, p_session_id)
  on conflict (visitor_id) do update
    set current_session_id = excluded.current_session_id, updated_at = now()
  returning id into v_profile_id;

  insert into public.profile_intelligence (profile_id)
  values (v_profile_id)
  on conflict (profile_id) do nothing;

  return v_profile_id;
end;
$$;

revoke all on function public.profile_upsert_root(uuid, uuid) from public, anon, authenticated;

create or replace function public.profile_backfill_journey(p_profile_id uuid, p_visitor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profile_journey_events (
    profile_id, event_name, source_kind, source_id, session_id, source_page,
    occurred_at, metadata, schema_version
  )
  select
    p_profile_id, e.event_type, 'telemetry', e.id, e.session_id, e.source_page,
    e.occurred_at,
    jsonb_strip_nulls(jsonb_build_object(
      'source', e.source,
      'consent_at_event', e.consent,
      'partner_id', e.payload->>'partner_id',
      'campaign_id', e.payload->>'campaign_id',
      'result', e.payload->>'result'
    )),
    e.schema_version
  from public.telemetry_events e
  where e.visitor_id = p_visitor_id
  on conflict (source_kind, source_id) do nothing;

  insert into public.profile_journey_events (
    profile_id, event_name, source_kind, source_id, session_id, source_page,
    occurred_at, metadata, schema_version
  )
  select
    p_profile_id, 'affiliate_conversion_' || ce.status, 'affiliate_conversion', ce.id,
    c.session_id, ac.source_page, ce.event_at,
    jsonb_strip_nulls(jsonb_build_object(
      'partner_id', c.partner_id,
      'campaign_id', c.campaign_id,
      'transaction_id', c.transaction_id,
      'status', ce.status,
      'commission', ce.commission,
      'currency', ce.currency
    )),
    c.schema_version
  from public.affiliate_conversion_events ce
  join public.affiliate_conversions c on c.id = ce.conversion_id
  left join public.affiliate_clicks ac on ac.id = c.original_click_id
  where c.visitor_id = p_visitor_id
  on conflict (source_kind, source_id) do nothing;
end;
$$;

revoke all on function public.profile_backfill_journey(uuid, uuid) from public, anon, authenticated;

create or replace function public.profile_capture_telemetry_journey()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_profile_id uuid;
begin
  select id into v_profile_id from public.smart_profiles where visitor_id = new.visitor_id;
  if v_profile_id is not null then
    insert into public.profile_journey_events (
      profile_id, event_name, source_kind, source_id, session_id, source_page,
      occurred_at, metadata, schema_version
    ) values (
      v_profile_id, new.event_type, 'telemetry', new.id, new.session_id, new.source_page,
      new.occurred_at,
      jsonb_strip_nulls(jsonb_build_object(
        'source', new.source,
        'consent_at_event', new.consent,
        'partner_id', new.payload->>'partner_id',
        'campaign_id', new.payload->>'campaign_id',
        'result', new.payload->>'result'
      )),
      new.schema_version
    ) on conflict (source_kind, source_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.profile_capture_telemetry_journey() from public, anon, authenticated;
drop trigger if exists telemetry_events_profile_journey on public.telemetry_events;
create trigger telemetry_events_profile_journey after insert on public.telemetry_events
for each row execute function public.profile_capture_telemetry_journey();

create or replace function public.profile_capture_conversion_journey()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_conversion public.affiliate_conversions%rowtype;
  v_source_page text;
begin
  select * into v_conversion from public.affiliate_conversions where id = new.conversion_id;
  select id into v_profile_id from public.smart_profiles where visitor_id = v_conversion.visitor_id;
  select source_page into v_source_page from public.affiliate_clicks where id = v_conversion.original_click_id;
  if v_profile_id is not null then
    insert into public.profile_journey_events (
      profile_id, event_name, source_kind, source_id, session_id, source_page,
      occurred_at, metadata, schema_version
    ) values (
      v_profile_id, 'affiliate_conversion_' || new.status, 'affiliate_conversion', new.id,
      v_conversion.session_id, v_source_page, new.event_at,
      jsonb_strip_nulls(jsonb_build_object(
        'partner_id', v_conversion.partner_id,
        'campaign_id', v_conversion.campaign_id,
        'transaction_id', v_conversion.transaction_id,
        'status', new.status,
        'commission', new.commission,
        'currency', new.currency
      )),
      v_conversion.schema_version
    ) on conflict (source_kind, source_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.profile_capture_conversion_journey() from public, anon, authenticated;
drop trigger if exists affiliate_conversion_events_profile_journey on public.affiliate_conversion_events;
create trigger affiliate_conversion_events_profile_journey after insert on public.affiliate_conversion_events
for each row execute function public.profile_capture_conversion_journey();

create or replace function public.profile_record_consent(
  p_secret text,
  p_visitor_id uuid,
  p_session_id uuid,
  p_purpose text,
  p_status text,
  p_policy_version text,
  p_source text
)
returns table(profile_id uuid, consent_id uuid, persisted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_previous public.profile_consents%rowtype;
  v_consent_id uuid;
  v_persisted_at timestamptz;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if p_purpose not in ('analytics', 'relationship', 'personalization', 'partner_sharing') then raise exception 'invalid consent purpose'; end if;
  if p_status not in ('granted', 'denied', 'withdrawn') then raise exception 'invalid consent status'; end if;
  if length(p_policy_version) not between 1 and 80 or length(p_source) not between 1 and 120 then raise exception 'invalid consent context'; end if;

  v_profile_id := public.profile_upsert_root(p_visitor_id, p_session_id);
  perform public.profile_backfill_journey(v_profile_id, p_visitor_id);

  select * into v_previous
  from public.profile_consents pc
  where pc.profile_id = v_profile_id and pc.purpose = p_purpose
  order by pc.captured_at desc, pc.id desc limit 1;

  if v_previous.id is not null and v_previous.status = p_status and v_previous.policy_version = p_policy_version then
    return query select v_profile_id, v_previous.id, v_previous.captured_at;
    return;
  end if;

  insert into public.profile_consents (
    profile_id, purpose, status, policy_version, source, session_id, supersedes_id
  ) values (
    v_profile_id, p_purpose, p_status, p_policy_version, p_source, p_session_id, v_previous.id
  ) returning id, captured_at into v_consent_id, v_persisted_at;

  return query select v_profile_id, v_consent_id, v_persisted_at;
end;
$$;

revoke all on function public.profile_record_consent(text, uuid, uuid, text, text, text, text) from public;
grant execute on function public.profile_record_consent(text, uuid, uuid, text, text, text, text) to anon, authenticated;

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
    on conflict (profile_id) do update set
      total_debt = excluded.total_debt, debt_count = excluded.debt_count,
      debt_types = excluded.debt_types, creditors = excluded.creditors, updated_at = v_now;
  else
    if length(trim(coalesce(p_full_name, ''))) < 2 or length(p_full_name) > 200 then raise exception 'invalid full name'; end if;
    if length(coalesce(p_email, '')) > 320 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid email'; end if;
    if p_monthly_income is null or p_monthly_income < 0 then raise exception 'invalid monthly income'; end if;
    if p_contact_consent not in ('granted', 'denied') then raise exception 'contact consent is required'; end if;

    insert into public.profile_identity (profile_id, full_name, email, locale)
    values (v_profile_id, trim(p_full_name), lower(trim(p_email)), 'pt-BR')
    on conflict (profile_id) do update set
      full_name = excluded.full_name, email = excluded.email, locale = excluded.locale, updated_at = v_now;

    insert into public.profile_financial_context (profile_id, monthly_income, estimated_months)
    values (v_profile_id, p_monthly_income, p_estimated_months)
    on conflict (profile_id) do update set
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

comment on table public.smart_profiles is 'Raiz pseudonimizada do Perfil Inteligente; finalidade: personalização e conformidade.';
comment on table public.profile_identity is 'Bloco Identidade; finalidade: personalização e relacionamento.';
comment on table public.profile_consents is 'Histórico append-only de consentimentos LGPD; finalidade: conformidade.';
comment on table public.profile_financial_context is 'Bloco Contexto Financeiro coletado progressivamente; finalidade: personalização e monetização.';
comment on table public.profile_journey_events is 'Bloco Jornada preenchido automaticamente por eventos; finalidade: analytics e personalização.';
comment on table public.profile_intelligence is 'Bloco futuro de atributos calculados; campos permanecem nulos até existir modelo aprovado.';
comment on column public.profile_identity.full_name is 'Personalização da orientação e relacionamento.';
comment on column public.profile_identity.email is 'Relacionamento e continuidade da jornada.';
comment on column public.profile_identity.phone is 'Relacionamento futuro; não coletado nesta fase.';
comment on column public.profile_identity.locale is 'Personalização de idioma e formatos.';
comment on column public.profile_consents.purpose is 'Conformidade: finalidade específica autorizada ou recusada.';
comment on column public.profile_consents.status is 'Conformidade: decisão vigente no instante do registro.';
comment on column public.profile_consents.policy_version is 'Conformidade: versão do aviso apresentado.';
comment on column public.profile_consents.supersedes_id is 'Conformidade: cadeia auditável de atualizações do consentimento.';
comment on column public.profile_financial_context.total_debt is 'Personalização do diagnóstico.';
comment on column public.profile_financial_context.monthly_income is 'Personalização da capacidade de pagamento.';
comment on column public.profile_financial_context.debt_count is 'Analytics e personalização do diagnóstico.';
comment on column public.profile_financial_context.debt_types is 'Personalização e monetização por aderência de solução.';
comment on column public.profile_financial_context.creditors is 'Personalização e monetização por aderência de parceiro.';
comment on column public.profile_financial_context.estimated_months is 'Personalização do plano de saída.';
comment on column public.profile_journey_events.event_name is 'Analytics: etapa automática da jornada.';
comment on column public.profile_journey_events.source_id is 'Conformidade e analytics: rastreabilidade até o evento de origem.';
comment on column public.profile_journey_events.metadata is 'Analytics e monetização; recorte mínimo, sem identidade pessoal.';
comment on column public.profile_intelligence.score_zafi is 'Personalização futura; não calculado nesta fase.';
comment on column public.profile_intelligence.conversion_probability is 'Monetização futura; não calculada nesta fase.';
comment on column public.profile_intelligence.interests is 'Personalização futura; não inferida nesta fase.';
comment on column public.profile_intelligence.calculated_attributes is 'Extensão versionada para atributos futuros de IA.';
