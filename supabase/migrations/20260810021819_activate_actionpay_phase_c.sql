-- Fase C - ativacao coordenada da integracao Actionpay.
-- Evidencias externas coletadas no painel oficial em 09/08/2026.
-- Nenhum segredo e armazenado nesta migration.

update public.affiliate_sources
set current_domain = 'https://meuzafi.com.br/',
    validation_status = 'validated',
    evidence_reference = 'Painel Actionpay > Fontes: fonte 359422, nome Zafi, dominio https://meuzafi.com.br/, estado Ativo; verificado em 09/08/2026.',
    validated_at = timestamptz '2026-08-09 22:22:00-03',
    updated_at = now()
where network = 'actionpay' and external_source_id = '359422';

with official_links(external_id,official_name,destination_url,conversion_action,commercial_status,evidence_required) as (
  values
    ('187558','Acordo Certo - Renegociacao de dividas - CPL',
      'https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount',
      'cadastro_online','commercial_ready','Nenhuma; link, modelo, acao e valor foram confirmados.'),
    ('177702','SuperSim - Emprestimo Pessoal - CPL',
      'https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount',
      'cadastro_online_valido','commercial_ready','Nenhuma; link, modelo, acao e tarifa-base foram confirmados.'),
    ('180635','FinanZero Emprestimos - CPA',
      'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount',
      'acao_cpa_pendente_confirmacao_oficial','pending_confirmation','Confirmar no regulamento oficial a acao exata que gera a participacao de 56%.'),
    ('185636','Bom Pra Credito - Emprestimo Pessoal - CPA',
      'https://apretailer.com.br/click/6a3f408d2bfa813afc65b8b7/185636/359422/subaccount',
      'emprestimo_aprovado','commercial_ready','Nenhuma comercial; bloqueio para trafego social permanece obrigatorio.'),
    ('179945','Juros Baixos - Emprestimo pessoal - CPL',
      'https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount',
      'cadastro_online_pendente_confirmacao_oficial','pending_confirmation','Confirmar regra exata da meta e remuneracao oficial da campanha CPL.')
)
update public.atlas_campaigns c
set name = o.official_name,
    status = 'active',
    conversion_action = o.conversion_action,
    commercial_status = o.commercial_status,
    last_validated_at = timestamptz '2026-08-09 22:22:00-03',
    evidence_reference = 'Painel Actionpay > Minhas campanhas > Obter links; URL integral comparada em 09/08/2026.',
    evidence_checked_at = timestamptz '2026-08-09 22:22:00-03',
    rules_and_restrictions = coalesce(c.rules_and_restrictions,'{}'::jsonb) || jsonb_build_object(
      'network_source_id','359422','official_link_validated',true,
      'official_link_checked_at','2026-08-09T22:22:00-03:00',
      'commercial_evidence_required',o.evidence_required
    ),
    updated_at = now()
from official_links o
where c.network = 'actionpay' and c.external_id = o.external_id;

with official_links(external_id,destination_url) as (
  values
    ('187558','https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount'),
    ('177702','https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount'),
    ('180635','https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount'),
    ('185636','https://apretailer.com.br/click/6a3f408d2bfa813afc65b8b7/185636/359422/subaccount'),
    ('179945','https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount')
)
update public.atlas_integrations i
set destination_url = o.destination_url,status = 'active',preserves_network_parameters = true,
    click_id_strategy = 'replace_subaccount_segment',click_id_parameter = 'subaccount',
    link_validation_status = 'validated',
    link_evidence_reference = 'URL oficial copiada de Obter links e comparada integralmente em 09/08/2026.',
    link_evidence_checked_at = timestamptz '2026-08-09 22:22:00-03',
    last_validated_at = timestamptz '2026-08-09 22:22:00-03',updated_at = now()
from public.atlas_campaigns c
join official_links o on o.external_id = c.external_id
where i.campaign_id = c.id and c.network = 'actionpay' and i.integration_type = 'redirect';

update public.atlas_remuneration r
set status = 'confirmed',confirmed_at = timestamptz '2026-08-09 22:22:00-03',
    source_reference = 'Painel Actionpay e auditoria comercial de 09/08/2026; link oficial comparado.',updated_at = now()
from public.atlas_campaigns c
where r.campaign_id = c.id and c.network = 'actionpay'
  and c.external_id in ('187558','177702','185636')
  and r.status = 'observed_audit' and r.effective_until is null;

update public.atlas_remuneration r
set status = 'observed_audit',
    source_reference = case c.external_id
      when '180635' then 'Link oficial validado em 09/08/2026; participacao de 56% observada; acao exata ainda pendente.'
      else 'Link CPL oficial validado em 09/08/2026; regra da meta e remuneracao ainda pendentes.' end,
    confirmed_at = null,updated_at = now()
from public.atlas_campaigns c
where r.campaign_id = c.id and c.network = 'actionpay'
  and c.external_id = '180635' and r.effective_until is null;


update public.atlas_remuneration r
set effective_until=timestamptz '2026-08-09 22:22:00-03',updated_at=now()
from public.atlas_campaigns c
where r.campaign_id=c.id and c.network='actionpay' and c.external_id='179945'
  and r.effective_until is null;

insert into public.atlas_remuneration(
  campaign_id,model,amount,percentage,currency,status,source_reference,effective_from,conversion_action
)
select c.id,'cpl',null,null,null,'observed_audit',
  'Link oficial confirma campanha CPL; regra da meta e remuneracao permanecem pendentes.',
  timestamptz '2026-08-09 22:22:00-03','cadastro_online_pendente_confirmacao_oficial'
from public.atlas_campaigns c where c.network='actionpay' and c.external_id='179945'
on conflict (campaign_id,effective_from) do update set
  model='cpl',amount=null,percentage=null,currency=null,status='observed_audit',
  source_reference=excluded.source_reference,confirmed_at=null,
  conversion_action=excluded.conversion_action,updated_at=now();

insert into public.actionpay_commercial_audit_observations(
  campaign_id,previous_model,observed_model,observed_amount,observed_percentage,currency,
  conversion_action,network_source_id,link_validation_status,evidence_reference,evidence_checked_at,evidence_required
)
select c.id,v.previous_model,v.observed_model,v.observed_amount,v.observed_percentage,v.currency,
  v.conversion_action,'359422','validated','Painel Actionpay > Obter links; comparacao integral registrada na Fase C.',
  timestamptz '2026-08-09 22:22:00-03',v.evidence_required
from (values
  ('187558','cpl','cpl',2.80::numeric,null::numeric,'BRL','cadastro_online','Nenhuma.'),
  ('177702','cpl','cpl',9.10::numeric,null::numeric,'BRL','cadastro_online_valido','Nenhuma.'),
  ('180635','revenue_share','revenue_share',null::numeric,56::numeric,'BRL','acao_cpa_pendente_confirmacao_oficial','Confirmar acao exata da conversao.'),
  ('185636','cpa','cpa',21.00::numeric,null::numeric,'BRL','emprestimo_aprovado','Manter bloqueio para trafego social.'),
  ('179945','pending_confirmation','cpl',null::numeric,null::numeric,null::text,'cadastro_online_pendente_confirmacao_oficial','Confirmar meta e remuneracao CPL.')
) as v(external_id,previous_model,observed_model,observed_amount,observed_percentage,currency,conversion_action,evidence_required)
join public.atlas_campaigns c on c.network = 'actionpay' and c.external_id = v.external_id
on conflict (campaign_id,evidence_checked_at) do nothing;


-- Acordo Certo CPA e uma campanha independente da CPL e nao entra no ranking nesta fase.
insert into public.atlas_campaigns(
  partner_id,external_id,name,network,status,last_validated_at,commercial_status,
  conversion_action,rules_and_restrictions,evidence_reference,evidence_checked_at
)
select p.id,'182268','Acordo Certo - Negociacao de Dividas - CPA','actionpay','review',
  timestamptz '2026-08-09 22:22:00-03','pending_confirmation','acao_cpa_pendente_confirmacao_oficial',
  jsonb_build_object('network_source_id','359422','official_link_validated',true,
    'excluded_from_recommendation_ranking',true,
    'commercial_evidence_required','Confirmar acao, remuneracao, moeda e condicoes de aprovacao.'),
  'Painel Actionpay > Obter links; campanha CPA separada da CPL.',
  timestamptz '2026-08-09 22:22:00-03'
from public.atlas_partners p where p.slug = 'acordo-certo'
on conflict (network,external_id) do update set
  name=excluded.name,status='review',last_validated_at=excluded.last_validated_at,
  commercial_status='pending_confirmation',conversion_action=excluded.conversion_action,
  rules_and_restrictions=excluded.rules_and_restrictions,
  evidence_reference=excluded.evidence_reference,evidence_checked_at=excluded.evidence_checked_at,updated_at=now();

insert into public.atlas_integrations(
  campaign_id,integration_type,destination_url,status,preserves_network_parameters,
  click_id_strategy,click_id_parameter,configuration,last_validated_at,
  link_validation_status,link_evidence_reference,link_evidence_checked_at
)
select c.id,'redirect',
  'https://apretailer.com.br/click/6a3f408e2bfa813aa85d2a53/182268/359422/subaccount',
  'active',true,'replace_subaccount_segment','subaccount','{}'::jsonb,
  timestamptz '2026-08-09 22:22:00-03','validated',
  'URL oficial copiada de Obter links em 09/08/2026.',timestamptz '2026-08-09 22:22:00-03'
from public.atlas_campaigns c where c.network='actionpay' and c.external_id='182268'
on conflict (campaign_id,integration_type) do update set
  destination_url=excluded.destination_url,status='active',preserves_network_parameters=true,
  click_id_strategy='replace_subaccount_segment',click_id_parameter='subaccount',
  link_validation_status='validated',link_evidence_reference=excluded.link_evidence_reference,
  link_evidence_checked_at=excluded.link_evidence_checked_at,last_validated_at=excluded.last_validated_at,updated_at=now();

insert into public.atlas_remuneration(
  campaign_id,model,amount,percentage,currency,status,source_reference,effective_from,conversion_action
)
select c.id,'cpa',null,null,null,'observed_audit',
  'Campanha CPA e link oficial confirmados; remuneracao e acao exata pendentes.',
  timestamptz '2026-08-09 22:22:00-03','acao_cpa_pendente_confirmacao_oficial'
from public.atlas_campaigns c where c.network='actionpay' and c.external_id='182268'
on conflict (campaign_id,effective_from) do update set
  model='cpa',amount=null,percentage=null,currency=null,status='observed_audit',
  source_reference=excluded.source_reference,confirmed_at=null,
  conversion_action=excluded.conversion_action,updated_at=now();

insert into public.actionpay_commercial_audit_observations(
  campaign_id,previous_model,observed_model,observed_amount,observed_percentage,currency,
  conversion_action,network_source_id,link_validation_status,evidence_reference,evidence_checked_at,evidence_required
)
select c.id,'not_registered','cpa',null,null,null,'acao_cpa_pendente_confirmacao_oficial',
  '359422','validated','Painel Actionpay > Obter links; campanha CPA independente.',
  timestamptz '2026-08-09 22:22:00-03','Confirmar acao, remuneracao, moeda e condicoes de aprovacao.'
from public.atlas_campaigns c where c.network='actionpay' and c.external_id='182268'
on conflict (campaign_id,evidence_checked_at) do nothing;

-- Registra apenas metadados do postback global 18939. A URL armazenada nunca contem token.
insert into public.atlas_integrations(
  campaign_id,integration_type,destination_url,status,preserves_network_parameters,
  click_id_strategy,click_id_parameter,configuration,last_validated_at,
  link_validation_status,link_evidence_reference,link_evidence_checked_at
)
select c.id,'postback','https://meuzafi.com.br/api/postbacks/actionpay','active',true,
  'query_parameter','click_id',jsonb_build_object(
    'actionpay_postback_id','18939',
    'events',jsonb_build_array('created','accepted','denied','paid'),
    'macros',jsonb_build_object('click_id','{subid1}','campaign_id','{offer}','status','{event}',
      'commission','{payment}','currency','{currency}','event_at','{time}','action_id','{apid}',
      'source_id','{source}','aim_id','{aim}','aim_type','{aimType}'),
    'secret_location','Vercel encrypted environment',
    'contains_secret',false
  ),timestamptz '2026-08-09 22:22:00-03','validated',
  'Painel Actionpay > Postbacks: ID 18939 ativo para Criado, Aceito, Negado e Pago.',
  timestamptz '2026-08-09 22:22:00-03'
from public.atlas_campaigns c
where c.network='actionpay' and c.external_id in ('187558','177702','180635','185636','179945','182268')
on conflict (campaign_id,integration_type) do update set
  destination_url='https://meuzafi.com.br/api/postbacks/actionpay',status='active',
  preserves_network_parameters=true,click_id_strategy='query_parameter',click_id_parameter='click_id',
  configuration=excluded.configuration,last_validated_at=excluded.last_validated_at,
  link_validation_status='validated',link_evidence_reference=excluded.link_evidence_reference,
  link_evidence_checked_at=excluded.link_evidence_checked_at,updated_at=now();

update public.integration_secret_rotation_plans
set status='executing',
    authorized_at=coalesce(authorized_at,timestamptz '2026-08-09 22:30:00-03'),
    coordination_plan=jsonb_build_array(
      'Novo segredo gerado pelo CEO no gerenciador de senhas sem compartilhamento com a Engenharia',
      'ACTIONPAY_POSTBACK_SECRET atualizado em Production na Vercel',
      'Postback Actionpay 18939 atualizado pelo CEO',
      'ACTIONPAY_POSTBACK_ENABLED habilitado em Production',
      'Aguardar primeiro evento real autenticado e persistido para concluir a rotacao'
    ),
    contains_secret_value=false,
    updated_at=now()
where network='actionpay' and secret_name='ACTIONPAY_POSTBACK_SECRET';

create or replace function private.actionpay_confirm_rotation_on_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists (
    select 1 from public.affiliate_conversions c
    where c.id = new.conversion_id and c.network = 'actionpay'
  ) then
    update public.integration_secret_rotation_plans
    set status='completed',executed_at=coalesce(executed_at,new.received_at),updated_at=now()
    where network='actionpay' and secret_name='ACTIONPAY_POSTBACK_SECRET'
      and status='executing' and contains_secret_value=false;
  end if;
  return new;
end;
$$;
revoke all on function private.actionpay_confirm_rotation_on_event() from public,anon,authenticated;
grant execute on function private.actionpay_confirm_rotation_on_event() to service_role;

drop trigger if exists actionpay_confirm_rotation_on_event on public.affiliate_conversion_events;
create trigger actionpay_confirm_rotation_on_event
after insert on public.affiliate_conversion_events
for each row execute function private.actionpay_confirm_rotation_on_event();

create or replace function public.actionpay_phase_b_snapshot(p_secret text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb; v_rotation_status text;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid actionpay snapshot secret' using errcode='42501';
  end if;
  select coalesce(status,'not_planned') into v_rotation_status
  from public.integration_secret_rotation_plans
  where network='actionpay' and secret_name='ACTIONPAY_POSTBACK_SECRET';
  v_rotation_status := coalesce(v_rotation_status,'not_planned');
  select jsonb_build_object(
    'generated_at',now(),
    'postback_status',case when v_rotation_status in ('executing','completed') then 'active' else 'prepared_not_activated' end,
    'token_rotation_status',v_rotation_status,
    'clicks_total',(select count(*) from public.affiliate_clicks where network='actionpay'),
    'created_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status in ('pending','approved','paid')),
    'approved_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status in ('approved','paid')),
    'rejected_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status in ('rejected','cancelled')),
    'paid_count',(select count(*) from public.affiliate_conversions where network='actionpay' and status='paid'),
    'revenue_created',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
      from (select currency,sum(commission) value from public.affiliate_conversions
        where network='actionpay' and status in ('pending','approved','paid')
          and commission is not null and currency is not null group by currency) x),'[]'::jsonb),
    'revenue_approved',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
      from (select currency,sum(commission) value from public.affiliate_conversions
        where network='actionpay' and status in ('approved','paid')
          and commission is not null and currency is not null group by currency) x),'[]'::jsonb),
    'revenue_paid',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'value',value) order by currency)
      from (select currency,sum(commission) value from public.affiliate_conversions
        where network='actionpay' and status='paid'
          and commission is not null and currency is not null group by currency) x),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.actionpay_phase_b_snapshot(text) from public,anon,authenticated;
grant execute on function public.actionpay_phase_b_snapshot(text) to service_role;

comment on function private.actionpay_confirm_rotation_on_event() is
  'Conclui a rotacao somente apos o primeiro evento Actionpay real, autenticado e persistido.';
comment on function public.actionpay_phase_b_snapshot(text) is
  'Snapshot financeiro Actionpay com estado real da ativacao e da rotacao, sem expor segredos.';
