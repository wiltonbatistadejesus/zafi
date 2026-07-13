-- Sprint 4.1 — ORÁCULO Entity Database
-- Architecture-only migration. Review in a staging branch before applying.

create schema if not exists knowledge;
comment on schema knowledge is 'Private canonical knowledge graph for ORÁCULO. Not exposed through the Data API.';

revoke all on schema knowledge from public, anon, authenticated;
grant usage on schema knowledge to service_role;

create table knowledge.entity_types (
  id smallint generated always as identity primary key,
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  schema_org_types text[] not null default '{}',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table knowledge.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type_id smallint not null references knowledge.entity_types(id),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  canonical_url text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  version bigint not null default 1 check (version > 0),
  published_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('portuguese'::regconfig, coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored,
  unique (entity_type_id, slug),
  check (status <> 'published' or published_at is not null)
);

create table knowledge.entity_aliases (
  id bigint generated always as identity primary key,
  entity_id uuid not null references knowledge.entities(id) on delete cascade,
  alias text not null,
  locale text not null default 'pt-BR',
  alias_kind text not null default 'synonym' check (alias_kind in ('synonym', 'acronym', 'former_name', 'search_term')),
  normalized_alias text generated always as (lower(trim(alias))) stored,
  unique (entity_id, normalized_alias, locale)
);

create table knowledge.relation_types (
  id smallint generated always as identity primary key,
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  inverse_key text references knowledge.relation_types(key) deferrable initially deferred,
  schema_org_property text,
  is_directed boolean not null default true,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table knowledge.relation_constraints (
  relation_type_id smallint not null references knowledge.relation_types(id) on delete cascade,
  endpoint text not null check (endpoint in ('source', 'target')),
  entity_type_id smallint not null references knowledge.entity_types(id) on delete cascade,
  primary key (relation_type_id, endpoint, entity_type_id)
);

create table knowledge.entity_relations (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references knowledge.entities(id) on delete cascade,
  relation_type_id smallint not null references knowledge.relation_types(id),
  target_entity_id uuid not null references knowledge.entities(id) on delete cascade,
  rank smallint not null default 100 check (rank > 0),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  valid_from timestamptz,
  valid_until timestamptz,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_entity_id, relation_type_id, target_entity_id),
  check (source_entity_id <> target_entity_id),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table knowledge.sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique check (url ~ '^https?://'),
  title text not null,
  publisher text not null,
  source_type text not null check (source_type in ('law', 'regulator', 'institution', 'research', 'news', 'editorial', 'dataset', 'other')),
  reliability_tier smallint not null default 3 check (reliability_tier between 1 and 5),
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table knowledge.claim_predicates (
  id smallint generated always as identity primary key,
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  value_kind text not null check (value_kind in ('text', 'number', 'boolean', 'date', 'money', 'duration', 'entity', 'json')),
  schema_org_property text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table knowledge.claims (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references knowledge.entities(id) on delete cascade,
  predicate_id smallint not null references knowledge.claim_predicates(id),
  object_entity_id uuid references knowledge.entities(id) on delete restrict,
  value jsonb,
  status text not null default 'draft' check (status in ('draft', 'verified', 'disputed', 'expired', 'archived')),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  valid_from timestamptz,
  valid_until timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((object_entity_id is null) <> (value is null)),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table knowledge.claim_sources (
  claim_id uuid not null references knowledge.claims(id) on delete cascade,
  source_id uuid not null references knowledge.sources(id) on delete restrict,
  support_kind text not null default 'supports' check (support_kind in ('supports', 'contradicts', 'context')),
  excerpt_locator text,
  primary key (claim_id, source_id, support_kind)
);

create table knowledge.content_nodes (
  entity_id uuid primary key references knowledge.entities(id) on delete cascade,
  content_kind text not null check (content_kind in ('article', 'faq', 'answer', 'glossary_term', 'guide', 'renegotiation_path')),
  headline text not null,
  body_markdown text,
  direct_answer text,
  editorial_status text not null default 'draft' check (editorial_status in ('draft', 'technical_review', 'legal_review', 'approved', 'retired')),
  reviewer_notes text,
  reading_minutes smallint check (reading_minutes > 0),
  check (body_markdown is not null or direct_answer is not null)
);

create table knowledge.questions (
  entity_id uuid primary key references knowledge.entities(id) on delete cascade,
  question_text text not null,
  intent text,
  audience text not null default 'consumer',
  answer_entity_id uuid references knowledge.entities(id) on delete restrict
);

create table knowledge.institutions (
  entity_id uuid primary key references knowledge.entities(id) on delete cascade,
  institution_kind text not null check (institution_kind in ('bank', 'fintech', 'credit_bureau', 'marketplace', 'regulator', 'other')),
  legal_name text,
  country_code char(2) not null default 'BR',
  official_website text,
  regulator_identifier text
);

create table knowledge.products (
  entity_id uuid primary key references knowledge.entities(id) on delete cascade,
  product_kind text not null check (product_kind in ('credit_card', 'personal_loan', 'payroll_loan', 'overdraft', 'financing', 'debt_agreement', 'other')),
  provider_entity_id uuid references knowledge.entities(id) on delete restrict,
  is_active boolean not null default true,
  terms_last_checked_at timestamptz
);

create table knowledge.tools (
  entity_id uuid primary key references knowledge.entities(id) on delete cascade,
  tool_kind text not null check (tool_kind in ('calculator', 'simulator', 'diagnostic', 'comparison')),
  route text,
  input_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(input_schema) = 'object'),
  output_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(output_schema) = 'object')
);

create table knowledge.partners (
  entity_id uuid primary key references knowledge.entities(id) on delete cascade,
  partner_kind text not null check (partner_kind in ('affiliate', 'direct', 'educational', 'data_provider', 'other')),
  disclosure text,
  active_from timestamptz,
  active_until timestamptz,
  check (active_until is null or active_from is null or active_until > active_from)
);

create table knowledge.pages (
  id uuid primary key default gen_random_uuid(),
  route text not null unique check (route ~ '^/'),
  primary_entity_id uuid not null references knowledge.entities(id) on delete restrict,
  template_key text not null,
  locale text not null default 'pt-BR',
  seo_title text,
  seo_description text,
  canonical_route text,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'redirected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (primary_entity_id, template_key, locale)
);

create table knowledge.page_entities (
  page_id uuid not null references knowledge.pages(id) on delete cascade,
  entity_id uuid not null references knowledge.entities(id) on delete restrict,
  role text not null check (role in ('primary', 'about', 'mentions', 'faq', 'source', 'related')),
  rank smallint not null default 100 check (rank > 0),
  primary key (page_id, entity_id, role)
);

create table knowledge.entity_revisions (
  id bigint generated always as identity primary key,
  entity_id uuid not null references knowledge.entities(id) on delete cascade,
  version bigint not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_id, version)
);

create index entities_type_status_idx on knowledge.entities (entity_type_id, status);
create index entities_review_due_idx on knowledge.entities (reviewed_at) where status = 'published';
create index entities_search_idx on knowledge.entities using gin (search_document);
create index entity_aliases_search_idx on knowledge.entity_aliases (normalized_alias);
create index relations_source_idx on knowledge.entity_relations (source_entity_id, relation_type_id, rank);
create index relations_target_idx on knowledge.entity_relations (target_entity_id, relation_type_id, rank);
create index relations_valid_idx on knowledge.entity_relations (valid_until) where valid_until is not null;
create index relation_constraints_entity_type_idx on knowledge.relation_constraints (entity_type_id, endpoint);
create index claims_subject_idx on knowledge.claims (subject_entity_id, predicate_id, status);
create index claims_object_idx on knowledge.claims (object_entity_id) where object_entity_id is not null;
create index claims_review_due_idx on knowledge.claims (reviewed_at) where status = 'verified';
create index claim_sources_source_idx on knowledge.claim_sources (source_id);
create index sources_verification_idx on knowledge.sources (last_verified_at, reliability_tier);
create index products_provider_idx on knowledge.products (provider_entity_id);
create index questions_answer_idx on knowledge.questions (answer_entity_id) where answer_entity_id is not null;
create index page_entities_entity_idx on knowledge.page_entities (entity_id, role, rank);
create index entity_revisions_author_idx on knowledge.entity_revisions (created_by) where created_by is not null;

create function knowledge.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entities_set_updated_at before update on knowledge.entities for each row execute function knowledge.set_updated_at();
create trigger relations_set_updated_at before update on knowledge.entity_relations for each row execute function knowledge.set_updated_at();
create trigger sources_set_updated_at before update on knowledge.sources for each row execute function knowledge.set_updated_at();
create trigger claims_set_updated_at before update on knowledge.claims for each row execute function knowledge.set_updated_at();
create trigger pages_set_updated_at before update on knowledge.pages for each row execute function knowledge.set_updated_at();

revoke all on function knowledge.set_updated_at() from public, anon, authenticated;

insert into knowledge.entity_types (key, name, schema_org_types, description) values
  ('institution', 'Instituição', array['Organization'], 'Banco, fintech, bureau, regulador ou marketplace.'),
  ('product', 'Produto financeiro', array['FinancialProduct'], 'Produto oferecido por uma instituição.'),
  ('debt_type', 'Tipo de dívida', array['DefinedTerm'], 'Classificação canônica de obrigação financeira.'),
  ('renegotiation_path', 'Caminho de renegociação', array['HowTo'], 'Processo ou canal para renegociar uma obrigação.'),
  ('question', 'Pergunta', array['Question'], 'Pergunta canônica com intenção identificada.'),
  ('answer', 'Resposta', array['Answer'], 'Resposta revisada ligada a uma ou mais perguntas.'),
  ('glossary_term', 'Termo de glossário', array['DefinedTerm'], 'Conceito financeiro definido e relacionado.'),
  ('tool', 'Ferramenta', array['SoftwareApplication'], 'Calculadora, simulador, diagnóstico ou comparador.'),
  ('partner', 'Parceiro', array['Organization'], 'Parceiro comercial, educacional ou de dados.'),
  ('article', 'Artigo', array['Article'], 'Conteúdo editorial derivado do grafo.'),
  ('page', 'Página', array['WebPage'], 'Representação publicável de entidades e relações.'),
  ('category', 'Categoria', array['DefinedTerm'], 'Taxonomia editorial de navegação.');

insert into knowledge.relation_types (key, name, inverse_key, schema_org_property, description) values
  ('offers', 'oferece', 'offered_by', 'makesOffer', 'Instituição ou parceiro oferece um produto.'),
  ('offered_by', 'oferecido por', 'offers', 'offeredBy', 'Produto é oferecido por uma instituição.'),
  ('creates_debt_type', 'pode gerar dívida', null, null, 'Produto pode originar um tipo de dívida.'),
  ('renegotiated_via', 'renegociado por', null, null, 'Dívida ou produto usa um caminho de renegociação.'),
  ('answers', 'responde', 'answered_by', 'suggestedAnswer', 'Resposta atende uma pergunta.'),
  ('answered_by', 'respondida por', 'answers', 'acceptedAnswer', 'Pergunta possui resposta revisada.'),
  ('defines', 'define', 'defined_by', 'defines', 'Conteúdo define um termo.'),
  ('calculated_by', 'calculado por', null, null, 'Conceito ou produto é apoiado por ferramenta.'),
  ('recommended_partner', 'parceiro relacionado', null, 'provider', 'Parceiro elegível para um contexto, sem implicar endosso.'),
  ('about', 'sobre', null, 'about', 'Conteúdo ou página trata de uma entidade.'),
  ('mentions', 'menciona', null, 'mentions', 'Conteúdo menciona uma entidade.'),
  ('related_to', 'relacionado a', 'related_to', 'relatedLink', 'Relação semântica simétrica.'),
  ('broader_than', 'mais amplo que', 'narrower_than', 'broader', 'Relação hierárquica de taxonomia.'),
  ('narrower_than', 'mais específico que', 'broader_than', 'narrower', 'Relação hierárquica de taxonomia.'),
  ('supported_by', 'sustentado por', null, 'citation', 'Entidade ou afirmação é sustentada por fonte.');

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'entity_types', 'entities', 'entity_aliases', 'relation_types', 'relation_constraints',
    'entity_relations', 'sources', 'claim_predicates', 'claims', 'claim_sources', 'content_nodes', 'questions', 'institutions',
    'products', 'tools', 'partners', 'pages', 'page_entities', 'entity_revisions'
  ] loop
    execute format('alter table knowledge.%I enable row level security', table_name);
  end loop;
end $$;

grant select on all tables in schema knowledge to service_role;
grant usage, select on all sequences in schema knowledge to service_role;
alter default privileges in schema knowledge revoke all on tables from public, anon, authenticated;
alter default privileges in schema knowledge revoke all on functions from public, anon, authenticated;
