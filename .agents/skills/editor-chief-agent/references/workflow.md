# Fluxo de orquestração

## Estados

`idea → brief_draft → brief_approved → production_draft → editorial_review → pending_approval → approved → published → measured`

Somente uma pessoa autorizada pode mover `pending_approval` para `approved`. Somente uma publicação real pode gerar `published`.

## Rastreabilidade

Usar:

- `cycle_id`: ciclo semanal;
- `theme_id`: tema canônico;
- `brief_id`: briefing aprovado;
- `asset_id`: ativo individual;
- `version`: revisão imutável;
- `parent_asset_id`: derivação;
- `source_ids`: evidências;
- `approval_id`: autorização humana;
- `publication_id`: publicação real;
- `utm_campaign` e `utm_content`: atribuição.

## Controle de duplicação

Comparar tema, intenção, URL-alvo, título, pergunta central e ativos agendados. Consolidar quando duas propostas responderem à mesma intenção.

## Handoff

O Editor Chief entrega o pacote ao Agente de Marketing. O Agente de Marketing valida gates OE-006C, cria UTMs finais, coleta aprovação, registra publicação e solicita medição ao Acquisition Analytics.
