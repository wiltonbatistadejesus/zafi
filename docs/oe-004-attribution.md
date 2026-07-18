# OE-004 — Atribuição financeira do Recommendation Engine

## Objetivo

Conectar cada impressão, clique e conversão à execução e à decisão que originaram a recomendação, preservando causalidade, snapshots históricos e estados financeiros distintos.

## Cadeia oficial

`recommendation_run → recommendation_decision → impression → affiliate_click → affiliate_conversion_event`

Todos os eventos de atribuição são append-only e possuem uma chave de idempotência. Um clique somente é aceito quando sessão, visitante, parceiro e campanha correspondem à execução e decisão informadas.

## Livro-razão

A tabela `recommendation_attribution_events` registra:

- tipo do evento: impressão, clique ou conversão;
- execução, decisão, produto, parceiro e campanha;
- identificador do evento de origem;
- chave de idempotência;
- estado financeiro;
- valor e moeda, quando existirem;
- snapshot do perfil, motor, Atlas, decisão, regras e evento;
- datas de ocorrência e persistência.

O navegador não possui acesso direto à tabela.

## Impressões

O resultado do Recommendation Engine passa a devolver `decisionId`. Antes de liberar os cards na tela, o navegador solicita a persistência das impressões. Uma única requisição registra uma impressão para cada decisão exibida. A repetição da mesma requisição não duplica eventos.

## Cliques

Os links `/go` transportam `run_id` e `decision_id`. O banco valida:

- vínculo da decisão com a execução;
- elegibilidade da decisão;
- sessão e visitante;
- parceiro e campanha;
- evento de telemetria correspondente.

Somente depois dessas validações o clique afiliado e seu evento de atribuição são persistidos.

## Conversões

Quando o postback contém o identificador do clique original, a conversão herda automaticamente a execução e a decisão. Cada mudança recebida pela rede gera um evento financeiro imutável.

Conversões sem clique original continuam registradas no ciclo financeiro, porém permanecem explicitamente não atribuídas. A Zafi não atribui causalidade sem evidência.

## Estados financeiros

- `created`: transação criada ou pendente;
- `approved`: comissão aprovada pela rede;
- `paid`: comissão efetivamente paga;
- `reversed`: transação rejeitada ou cancelada.

As métricas financeiras acumuladas são separadas em:

- receita criada: transações pendentes, aprovadas ou pagas;
- receita aprovada: transações aprovadas ou pagas;
- receita paga: somente transações pagas.

Essa definição mantém os valores em estágios cumulativos sem misturar aprovação com caixa recebido.

## Métricas agregadas

As views protegidas `recommendation_attribution_funnel_daily` e `recommendation_attribution_finance_current` disponibilizam:

- impressões;
- cliques;
- conversões;
- conversões aprovadas;
- conversões pagas;
- receita criada;
- receita aprovada;
- receita paga;
- métricas por execução, decisão, produto, parceiro e campanha.

## CEO Cockpit

O Cockpit mostra:

- impressões, cliques e conversões atribuídas;
- cobertura de atribuição dos cliques e conversões;
- receita criada, aprovada e paga;
- decisões com melhor atividade;
- histórico financeiro existente.

Quando não existe base real, o painel apresenta `Sem base`. Nenhum percentual ou valor é estimado.

## Limites desta fase

- nenhuma regra do Atlas foi alterada;
- nenhuma recomendação é reordenada com base em performance;
- não existe otimização automática;
- não existe machine learning;
- os dados servem apenas para auditoria, leitura executiva e futuros experimentos autorizados.
