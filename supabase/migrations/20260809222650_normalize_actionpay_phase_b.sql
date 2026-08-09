-- Fase B - normalizacao comercial e preparacao interna das conversoes Actionpay.
-- Nao altera URLs, painel Actionpay, fonte externa, postbacks externos ou credenciais.

alter table public.atlas_integrations
  add column if not exists link_validation_status text not null default 'pending_official_comparison',
  add column if not exists link_evidence_reference text,
  add column if not exists link_evidence_checked_at timestamptz;

alter table public.atlas_integrations
  drop constraint if exists atlas_integrations_link_validation_status_check;
alter table public.atlas_integrations
  add constraint atlas_integrations_link_validation_status_check
  check (link_validation_status in ('pending_official_comparison','validated','mismatch'));

alter table public.atlas_remuneration
  drop constraint if exists atlas_remuneration_status_check;
alter table public.atlas_remuneration
  add constraint atlas_remuneration_status_check
  check (status in ('pending_confirmation','observed_audit','confirmed','expired'));

create table public.actionpay_commercial_audit_observations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.atlas_campaigns(id) on delete restrict,
  previous_model text not null,
  observed_model text not null check (observed_model in ('cpc','cpl','cpa','revenue_share','fixed','pending_confirmation')),
  observed_amount numeric(14,4) check (observed_amount is null or observed_amount >= 0),
  observed_percentage numeric(8,4) check (observed_percentage is null or observed_percentage between 0 and 100),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  conversion_action text,
  network_source_id text not null default '359422',
  link_validation_status text not null default 'pending_official_comparison'
    check (link_validation_status in ('pending_official_comparison','validated','mismatch')),
  evidence_reference text not null,
  evidence_checked_at timestamptz not null,
  evidence_required text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, evidence_checked_at)
);

create index actionpay_commercial_observations_campaign_idx
  on public.actionpay_commercial_audit_observations(campaign_id, evidence_checked_at desc);
alter table public.actionpay_commercial_audit_observations enable row level security;
revoke all on table public.actionpay_commercial_audit_observations from public,anon,authenticated;
create policy actionpay_commercial_observations_deny_direct
  on public.actionpay_commercial_audit_observations as restrictive for all to anon,authenticated
  using (false) with check (false);
create trigger actionpay_commercial_observations_append_only
before update or delete on public.actionpay_commercial_audit_observations
for each row execute function public.telemetry_block_mutation();

create table public.integration_secret_rotation_plans (
  id uuid primary key default gen_random_uuid(),
  network text not null,
  secret_name text not null,
  status text not null check (status in ('awaiting_ceo_authorization','authorized','executing','completed','rolled_back')),
  compromise_reason text not null,
  generation_plan jsonb not null check (jsonb_typeof(generation_plan)='array'),
  coordination_plan jsonb not null check (jsonb_typeof(coordination_plan)='array'),
  rollback_plan jsonb not null check (jsonb_typeof(rollback_plan)='array'),
  test_plan jsonb not null check (jsonb_typeof(test_plan)='array'),
  contains_secret_value boolean not null default false check (contains_secret_value=false),
  authorized_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network,secret_name)
);

alter table public.integration_secret_rotation_plans enable row level security;
revoke all on table public.integration_secret_rotation_plans from public,anon,authenticated;
create policy integration_secret_rotation_plans_deny_direct
  on public.integration_secret_rotation_plans as restrictive for all to anon,authenticated
  using (false) with check (false);

insert into public.integration_secret_rotation_plans(
  network,secret_name,status,compromise_reason,generation_plan,coordination_plan,rollback_plan,test_plan
) values (
  'actionpay','ACTIONPAY_POSTBACK_SECRET','awaiting_ceo_authorization',
  'Token exibido em capturas; tratar como comprometido sem registrar o valor.',
  '["Gerar segredo criptograficamente aleatorio com no minimo 32 bytes","Armazenar somente no cofre da Vercel","Nunca registrar o valor em codigo, banco, logs ou documentos"]'::jsonb,
  '["Criar nova versao no cofre sem remover a anterior","Atualizar o postback Actionpay somente apos autorizacao do CEO","Ativar ACTIONPAY_POSTBACK_ENABLED apenas durante a janela coordenada"]'::jsonb,
  '["Desativar ACTIONPAY_POSTBACK_ENABLED","Restaurar a versao anterior no cofre se a Actionpay nao confirmar","Manter auditoria e nao apagar eventos recebidos"]'::jsonb,
  '["Token antigo deve retornar 401","Token novo deve autenticar","Replay deve ser idempotente","Evento deve associar ao click ID e aparecer no Cockpit"]'::jsonb
) on conflict (network,secret_name) do update set
  status='awaiting_ceo_authorization',
  compromise_reason=excluded.compromise_reason,
  generation_plan=excluded.generation_plan,
  coordination_plan=excluded.coordination_plan,
  rollback_plan=excluded.rollback_plan,
  test_plan=excluded.test_plan,
  contains_secret_value=false,
  updated_at=now();

with audit_values(external_id,previous_model,observed_model,amount,percentage,currency,conversion_action,evidence_required) as (
  values
    ('187558','pending_confirmation','cpl',2.80::numeric,null::numeric,'BRL','cadastro_online','Link oficial obtido em Obter links e comparado integralmente com a URL atual.'),
    ('177702','pending_confirmation','cpl',9.10::numeric,null::numeric,'BRL','cadastro_online_valido','Link oficial obtido em Obter links e comparado integralmente com a URL atual.'),
    ('180635','pending_confirmation','revenue_share',null::numeric,56::numeric,'BRL','acao_cpa_pendente_confirmacao_oficial','Link oficial e regra exata da acao CPA obtidos em Obter links.'),
    ('185636','pending_confirmation','cpa',21.00::numeric,null::numeric,'BRL','emprestimo_aprovado','Link oficial obtido em Obter links e comparado; bloqueio social deve permanecer ativo.'),
    ('179945','pending_confirmation','pending_confirmation',null::numeric,null::numeric,null::text,null::text,'Confirmar em Obter links se a campanha e CPL ou CPA e obter a regra oficial da meta.')
)
insert into public.actionpay_commercial_audit_observations(
  campaign_id,previous_model,observed_model,observed_amount,observed_percentage,currency,
  conversion_action,network_source_id,link_validation_status,evidence_reference,evidence_checked_at,evidence_required
)
select c.id,v.previous_model,v.observed_model,v.amount,v.percentage,v.currency,v.conversion_action,
  '359422','pending_official_comparison','Auditoria Actionpay de 09/08/2026 autorizada na Fase B.',
  timestamptz '2026-08-09 00:00:00-03',v.evidence_required
from audit_values v
join public.atlas_campaigns c on c.network='actionpay' and c.external_id=v.external_id
on conflict (campaign_id,evidence_checked_at) do nothing;

update public.atlas_remuneration r
set effective_until=timestamptz '2026-08-09 00:00:00-03',updated_at=now()
from public.atlas_campaigns c
where c.id=r.campaign_id and c.network='actionpay'
  and c.external_id in ('187558','177702','180635','185636')
  and r.status='pending_confirmation' and r.effective_until is null
  and (r.effective_from is null or r.effective_from<timestamptz '2026-08-09 00:00:00-03');

with normalized(external_id,model,amount,percentage,currency,conversion_action) as (
  values
    ('187558','cpl',2.80::numeric,null::numeric,'BRL','cadastro_online'),
    ('177702','cpl',9.10::numeric,null::numeric,'BRL','cadastro_online_valido'),
    ('180635','revenue_share',null::numeric,56::numeric,'BRL','acao_cpa_pendente_confirmacao_oficial'),
    ('185636','cpa',21.00::numeric,null::numeric,'BRL','emprestimo_aprovado')
)
insert into public.atlas_remuneration(
  campaign_id,model,amount,percentage,currency,status,source_reference,
  effective_from,confirmed_at,conversion_action
)
select c.id,n.model,n.amount,n.percentage,n.currency,'observed_audit',
  'Auditoria Actionpay 09/08/2026: modelo e valor observados; link oficial ainda nao comparado.',
  timestamptz '2026-08-09 00:00:00-03',null,n.conversion_action
from normalized n
join public.atlas_campaigns c on c.network='actionpay' and c.external_id=n.external_id
on conflict (campaign_id,effective_from) do update set
  model=excluded.model,amount=excluded.amount,percentage=excluded.percentage,currency=excluded.currency,
  status='observed_audit',source_reference=excluded.source_reference,confirmed_at=null,
  conversion_action=excluded.conversion_action,updated_at=now();

with updates(external_id,conversion_action) as (
  values
    ('187558','cadastro_online'),
    ('177702','cadastro_online_valido'),
    ('180635','acao_cpa_pendente_confirmacao_oficial'),
    ('185636','emprestimo_aprovado'),
    ('179945',null::text)
)
update public.atlas_campaigns c
set conversion_action=u.conversion_action,
    commercial_status='pending_confirmation',
    evidence_reference='Auditoria Actionpay 09/08/2026; validacao do link oficial ainda pendente.',
    evidence_checked_at=timestamptz '2026-08-09 00:00:00-03',
    rules_and_restrictions=coalesce(c.rules_and_restrictions,'{}'::jsonb) || jsonb_build_object(
      'commercial_audit_status','observed_not_link_validated',
      'official_link_comparison_required',true,
      'network_source_id','359422'
    ),
    updated_at=now()
from updates u
where c.network='actionpay' and c.external_id=u.external_id;

update public.atlas_integrations i
set link_validation_status='pending_official_comparison',
    link_evidence_reference='Aguardando URL oficial obtida em Obter links na Actionpay; URL atual preservada.',
    link_evidence_checked_at=timestamptz '2026-08-09 00:00:00-03',
    updated_at=now()
from public.atlas_campaigns c
where c.id=i.campaign_id and c.network='actionpay'
  and c.external_id in ('187558','177702','180635','185636','179945')
  and i.integration_type='redirect';

create or replace view public.actionpay_campaign_commercial_matrix
with (security_invoker=true)
as
select
  p.name partner,
  c.external_id campaign_id,
  i.destination_url current_atlas_url,
  o.previous_model atlas_model_before_phase_b,
  o.observed_model correct_model_from_audit,
  r.model normalized_atlas_model,
  r.amount observed_amount,
  r.percentage observed_percentage,
  r.currency,
  '359422'::text network_source_id,
  i.click_id_strategy,
  case when i.destination_url like '%/359422/subaccount%' then 'source_and_subaccount_present' else 'requires_review' end click_id_subaccount_status,
  i.link_validation_status,
  c.commercial_status,
  o.evidence_reference,
  o.evidence_required
from public.atlas_campaigns c
join public.atlas_partners p on p.id=c.partner_id
left join public.atlas_integrations i on i.campaign_id=c.id and i.integration_type='redirect'
left join lateral (
  select * from public.actionpay_commercial_audit_observations x
  where x.campaign_id=c.id order by x.evidence_checked_at desc limit 1
) o on true
left join lateral (
  select * from public.atlas_remuneration x
  where x.campaign_id=c.id order by coalesce(x.effective_from,x.created_at) desc limit 1
) r on true
where c.network='actionpay' and c.external_id in ('187558','177702','180635','185636','179945');
revoke all on table public.actionpay_campaign_commercial_matrix from public,anon,authenticated;

alter table public.affiliate_conversion_events
  add column if not exists network_event text generated always as (
    case status
      when 'pending' then 'created'
      when 'approved' then 'accepted'
      when 'paid' then 'paid'
      else 'denied'
    end
  ) stored;

alter table public.affiliate_conversion_events
  drop constraint if exists affiliate_conversion_events_network_event_check;
alter table public.affiliate_conversion_events
  add constraint affiliate_conversion_events_network_event_check
  check (network_event in ('created','accepted','denied','paid'));

create or replace function private.affiliate_status_transition_allowed(p_from text,p_to text)
returns boolean language sql immutable set search_path=pg_catalog as $$
  select case
    when p_from is null or p_from=p_to then true
    when p_from='pending' and p_to in ('approved','paid','rejected','cancelled') then true
    when p_from='approved' and p_to in ('paid','rejected','cancelled') then true
    when p_from='paid' and p_to in ('rejected','cancelled') then true
    else false
  end;
$$;
revoke all on function private.affiliate_status_transition_allowed(text,text) from public,anon,authenticated;

create or replace function public.affiliate_record_conversion(
  p_secret text,p_request_id text,p_network text,p_idempotency_key text,p_transaction_id text,
  p_original_click_id uuid,p_partner_id text,p_partner_name text,p_campaign_id text,p_campaign_name text,
  p_status text,p_commission numeric,p_currency text,p_event_at timestamptz,p_converted_at timestamptz,
  p_raw_payload jsonb,p_raw_payload_hash text,p_schema_version integer default 2
)
returns table(conversion_id uuid,conversion_event_id uuid,duplicate boolean,persisted_at timestamptz)
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare
  v_click public.affiliate_clicks%rowtype;
  v_conversion public.affiliate_conversions%rowtype;
  v_conversion_id uuid; v_event_id uuid; v_existing_event uuid;
  v_now timestamptz:=now(); v_event_at timestamptz:=coalesce(p_event_at,now());
  v_partner_id text; v_partner_name text; v_campaign_id text; v_campaign_name text;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode='42501';
  end if;
  if nullif(trim(p_transaction_id),'') is null or length(p_transaction_id)>200 then
    raise exception 'invalid transaction id';
  end if;
  if p_original_click_id is null then raise exception 'original click id required'; end if;
  if p_status not in ('pending','approved','paid','rejected','cancelled') then
    raise exception 'invalid conversion status';
  end if;
  if p_commission is not null and p_commission<0 then raise exception 'invalid commission'; end if;
  if p_currency is not null and upper(p_currency)!~'^[A-Z]{3}$' then raise exception 'invalid currency'; end if;
  if p_status in ('approved','paid') and (p_commission is null or p_currency is null) then
    raise exception 'approved or paid conversion requires commission and currency';
  end if;
  if octet_length(coalesce(p_raw_payload,'{}'::jsonb)::text)>32768 then
    raise exception 'postback payload too large';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(left(p_network,80)||'|'||left(p_transaction_id,200),0));

  select * into v_click from public.affiliate_clicks where id=p_original_click_id;
  if v_click.id is null then raise exception 'original click not found'; end if;
  if v_click.network<>p_network then raise exception 'click and network mismatch'; end if;
  if p_campaign_id is not null and p_campaign_id<>v_click.campaign_id then
    raise exception 'click and campaign mismatch';
  end if;

  v_partner_id:=v_click.partner_id; v_partner_name:=v_click.partner_name;
  v_campaign_id:=v_click.campaign_id; v_campaign_name:=v_click.campaign_name;

  select e.id,e.conversion_id into v_existing_event,v_conversion_id
  from public.affiliate_conversion_events e where e.idempotency_key=p_idempotency_key;
  if v_existing_event is not null then
    insert into public.affiliate_postback_audit(
      request_id,network,idempotency_key,transaction_id,original_click_id,partner_id,campaign_id,
      outcome,http_status,reason,raw_payload,raw_payload_hash
    ) values (
      left(p_request_id,200),left(p_network,80),left(p_idempotency_key,128),left(p_transaction_id,200),
      p_original_click_id,left(v_partner_id,120),left(v_campaign_id,120),'duplicate',200,
      'Idempotent replay; no financial mutation.',coalesce(p_raw_payload,'{}'::jsonb),left(p_raw_payload_hash,128)
    );
    return query select v_conversion_id,v_existing_event,true,v_now; return;
  end if;

  select * into v_conversion from public.affiliate_conversions
  where network=left(p_network,80) and transaction_id=left(p_transaction_id,200) for update;
  if v_conversion.id is not null then
    if v_conversion.original_click_id is distinct from p_original_click_id then
      raise exception 'transaction and click mismatch';
    end if;
    if v_conversion.campaign_id<>v_campaign_id then raise exception 'transaction and campaign mismatch'; end if;
    if v_event_at>=v_conversion.last_event_at
       and not private.affiliate_status_transition_allowed(v_conversion.status,p_status) then
      raise exception 'invalid conversion status transition from % to %',v_conversion.status,p_status;
    end if;
  end if;

  insert into public.affiliate_conversions(
    network,transaction_id,original_click_id,partner_id,partner_name,campaign_id,campaign_name,
    session_id,visitor_id,status,commission,currency,converted_at,first_received_at,last_received_at,
    last_event_at,raw_payload,schema_version
  ) values (
    left(p_network,80),left(p_transaction_id,200),v_click.id,left(v_partner_id,120),left(v_partner_name,200),
    left(v_campaign_id,120),left(v_campaign_name,300),v_click.session_id,v_click.visitor_id,p_status,p_commission,
    upper(p_currency),p_converted_at,v_now,v_now,v_event_at,coalesce(p_raw_payload,'{}'::jsonb),
    greatest(2,coalesce(p_schema_version,2))
  ) on conflict (network,transaction_id) do update set
    status=case when excluded.last_event_at>=public.affiliate_conversions.last_event_at then excluded.status else public.affiliate_conversions.status end,
    commission=case when excluded.last_event_at>=public.affiliate_conversions.last_event_at then excluded.commission else public.affiliate_conversions.commission end,
    currency=case when excluded.last_event_at>=public.affiliate_conversions.last_event_at then excluded.currency else public.affiliate_conversions.currency end,
    converted_at=case when excluded.last_event_at>=public.affiliate_conversions.last_event_at then coalesce(excluded.converted_at,public.affiliate_conversions.converted_at) else public.affiliate_conversions.converted_at end,
    last_received_at=v_now,
    last_event_at=greatest(public.affiliate_conversions.last_event_at,excluded.last_event_at),
    raw_payload=case when excluded.last_event_at>=public.affiliate_conversions.last_event_at then excluded.raw_payload else public.affiliate_conversions.raw_payload end,
    schema_version=greatest(public.affiliate_conversions.schema_version,excluded.schema_version),
    updated_at=v_now
  returning id into v_conversion_id;

  insert into public.affiliate_conversion_events(
    conversion_id,idempotency_key,transaction_id,status,commission,currency,event_at,raw_payload,
    raw_payload_hash,request_id
  ) values (
    v_conversion_id,left(p_idempotency_key,128),left(p_transaction_id,200),p_status,p_commission,
    upper(p_currency),v_event_at,coalesce(p_raw_payload,'{}'::jsonb),left(p_raw_payload_hash,128),left(p_request_id,200)
  ) returning id into v_event_id;

  insert into public.affiliate_postback_audit(
    request_id,network,idempotency_key,transaction_id,original_click_id,partner_id,campaign_id,
    outcome,http_status,reason,raw_payload,raw_payload_hash
  ) values (
    left(p_request_id,200),left(p_network,80),left(p_idempotency_key,128),left(p_transaction_id,200),
    p_original_click_id,left(v_partner_id,120),left(v_campaign_id,120),'accepted',201,
    'Conversion state persisted.',coalesce(p_raw_payload,'{}'::jsonb),left(p_raw_payload_hash,128)
  );

  return query select v_conversion_id,v_event_id,false,v_now;
end;
$$;
revoke all on function public.affiliate_record_conversion(text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamptz,timestamptz,jsonb,text,integer)
  from public,anon,authenticated;
grant execute on function public.affiliate_record_conversion(text,text,text,text,text,uuid,text,text,text,text,text,numeric,text,timestamptz,timestamptz,jsonb,text,integer)
  to service_role;
revoke all on function public.affiliate_record_postback_audit(text,text,text,text,integer,text,jsonb,text,text,text,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.affiliate_record_postback_audit(text,text,text,text,integer,text,jsonb,text,text,text,uuid,text,text)
  to service_role;

create or replace view public.actionpay_click_reconciliation
with (security_invoker=true)
as
select
  cl.id click_id,cl.partner_id,cl.partner_name,cl.campaign_id,cl.campaign_name,
  cl.network_source_id,cl.occurred_at click_at,
  count(c.id)::bigint conversion_count,
  max(c.status) filter(where c.id is not null) latest_conversion_status,
  max(c.financial_state) filter(where c.id is not null) latest_financial_state,
  max(c.transaction_id) filter(where c.id is not null) transaction_id,
  max(c.last_received_at) filter(where c.id is not null) last_conversion_received_at
from public.affiliate_clicks cl
left join public.affiliate_conversions c on c.original_click_id=cl.id
where cl.network='actionpay' and cl.campaign_id in ('187558','177702','180635','185636','179945')
group by cl.id;
revoke all on table public.actionpay_click_reconciliation from public,anon,authenticated;

create or replace function public.actionpay_phase_b_snapshot(p_secret text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid phase b snapshot secret' using errcode='42501';
  end if;
  select jsonb_build_object(
    'generated_at',now(),
    'postback_status','prepared_not_activated',
    'token_rotation_status',coalesce((select status from public.integration_secret_rotation_plans
      where network='actionpay' and secret_name='ACTIONPAY_POSTBACK_SECRET'),'not_planned'),
    'clicks_total',(select count(*) from public.affiliate_clicks where network='actionpay'),
    'created_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status in ('pending','approved','paid')),
    'approved_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status in ('approved','paid')),
    'rejected_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status in ('rejected','cancelled')),
    'paid_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status='paid'),
    'revenue_created',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
      from (select currency,sum(commission) value from public.affiliate_conversions
        where network='actionpay' and status in ('pending','approved','paid') and commission is not null and currency is not null group by currency) x),'[]'::jsonb),
    'revenue_approved',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
      from (select currency,sum(commission) value from public.affiliate_conversions
        where network='actionpay' and status in ('approved','paid') and commission is not null and currency is not null group by currency) x),'[]'::jsonb),
    'revenue_paid',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
      from (select currency,sum(commission) value from public.affiliate_conversions
        where network='actionpay' and status='paid' and commission is not null and currency is not null group by currency) x),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.actionpay_phase_b_snapshot(text) from public,anon,authenticated;
grant execute on function public.actionpay_phase_b_snapshot(text) to service_role;

comment on table public.actionpay_commercial_audit_observations is
  'Observacoes comerciais da auditoria Actionpay; valores observados nao equivalem a link validado.';
comment on table public.integration_secret_rotation_plans is
  'Plano de rotacao sem armazenar segredos; execucao exige autorizacao explicita do CEO.';
comment on view public.actionpay_campaign_commercial_matrix is
  'Comparacao interna entre URL Atlas, modelo anterior, modelo normalizado e evidencia ainda necessaria.';
comment on view public.actionpay_click_reconciliation is
  'Relatorio interno dos click IDs historicos Actionpay e sua eventual conversao, sem criar dados retroativos.';
comment on function public.actionpay_phase_b_snapshot(text) is
  'Snapshot do Cockpit com cliques, estados de conversao e receita exclusivamente derivada de postbacks.';