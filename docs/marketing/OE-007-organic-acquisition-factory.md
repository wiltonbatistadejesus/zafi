# OE-007 — Fábrica de Aquisição Orgânica Zafi

## Decisão executiva

Implementar uma operação reutilizável de aquisição orgânica composta por agentes especializados, coordenados pelo Editor Chief e integrada ao Agente de Marketing existente.

A fábrica pesquisa, planeja, produz, organiza e mede. Ela não publica, compra mídia ou altera sistemas financeiros.

## Arquitetura

### Editor Chief

Orquestra o ciclo, escolhe o tema semanal, evita duplicação, valida identidade e compliance, distribui briefings, consolida o manifesto e prepara o handoff para aprovação humana.

### SEO Intelligence Agent

Analisa Search Console, identifica consultas em posições 8–30, páginas com potencial e oportunidades de atualização ou criação, sempre com evidência.

### Creative Intelligence Agent

Pesquisa tendências, notícias, dúvidas e perguntas recorrentes. Toda oportunidade exige fonte e data; hipóteses permanecem identificadas como hipóteses.

### Content Factory Agent

Deriva de um tema canônico artigos, FAQ, roteiros, posts, mensagens, newsletter, e-mail, CTA e metadados, mantendo todos os ativos em `draft`.

### Video Studio Agent

Produz pacotes de 15, 30 e 60 segundos com roteiro, storyboard, cenas, enquadramentos, prompts, thumbnail, legenda e CTA, sem renderização ou publicação automática.

### Landing Optimizer Agent

Audita SEO, velocidade, UX, CTA, acessibilidade, legibilidade e abandono. Entrega backlog priorizado e nunca altera a página.

### Acquisition Analytics Agent

Consolida banco, Cockpit, GA4, Search Console e Atlas, separando aquisição e monetização conforme OE-006C.

### Agente de Marketing Zafi

Permanece responsável pelos gates OE-006C, UTMs finais, aprovação humana, registro de publicação e medição. A OE-007 não duplica essas funções.

## Fluxo

`sinal → tema → briefing → produção draft → revisão editorial → aprovação humana → publicação manual → medição`

O fluxo utiliza identificadores estáveis:

- `cycle_id` para o ciclo;
- `theme_id` para o tema canônico;
- `brief_id` para o briefing;
- `asset_id` e versão para cada ativo;
- `source_ids` para evidências;
- `approval_id` para autorização humana;
- `publication_id` para publicação real;
- UTMs para atribuição.

## Biblioteca

Estrutura versionada em `docs/marketing/`:

- `articles/`;
- `campaigns/`;
- `videos/`;
- `images/`;
- `carousels/`;
- `emails/`;
- `seo/`;
- `prompts/`;
- `trends/`;
- `reports/`;
- `calendar/`.

O arquivo `asset-registry.json` é o índice dos ativos e possui contrato em `asset-registry.schema.json`.

## Calendário de 90 dias

O Editor Chief possui um gerador determinístico que recebe a data inicial e cria 90 linhas com tema, objetivo, ângulo, canal, CTA, prioridade, estágio e responsável.

Todo item nasce como `draft`. O calendário é capacidade planejada, não compromisso de publicação. Antes de cada briefing, o Editor Chief deve revisar evidência, duplicação e capacidade.

## Governança

Nenhum agente pode:

- publicar ou enviar mensagens;
- comprar mídia;
- alterar página automaticamente;
- alterar Atlas, Recommendation Engine, ranking, pesos, elegibilidade, ofertas ou integrações;
- prometer crédito, score, desconto ou resultado financeiro;
- inventar número, fonte, tendência ou depoimento;
- interpretar silêncio como aprovação.

## Estados

`idea → brief_draft → brief_approved → production_draft → editorial_review → pending_approval → approved → published → measured`

Produção permanece em `draft` até revisão. Apenas uma pessoa autorizada pode aprovar. Apenas uma publicação real pode gerar o estado `published`.

## Critérios de aceite

1. Sete agentes possuem `SKILL.md`, contrato e critérios de aceite.
2. Editor Chief possui fluxo de delegação e handoff.
3. Produção nasce como `draft`.
4. Registro de ativos exige versão e caminho.
5. Tema, briefing, ativo, aprovação, publicação e UTM são rastreáveis.
6. Nenhum agente publica automaticamente.
7. Biblioteca e calendário de 90 dias existem.
8. Agente de Marketing existente foi integrado sem duplicação.
9. Nenhum motor financeiro foi alterado.

## Situação

Implementação estrutural concluída. O primeiro ciclo está em revisão editorial e nenhuma publicação foi realizada.

## Evidências de validação

- sete agentes inicializados e formalmente válidos;
- sete contratos de entrada e saída presentes;
- calendário com exatamente 90 dias;
- duas gerações do calendário produziram resultado idêntico;
- calendário registrado automaticamente no inventário;
- campanha preexistente e primeiro ciclo editorial adicionados ao inventário;
- nenhum placeholder remanescente;
- nenhuma alteração em `app/`, `lib/`, `components/` ou `supabase/`;
- nenhuma publicação, mídia paga ou mutação de motor financeiro executada.
