# OE-006B — Agente de Marketing Zafi

## Decisão executiva

Criar e iniciar o Agente de Marketing Zafi em modo supervisionado. O agente será responsável por planejar, produzir, submeter para aprovação e medir campanhas orientadas a usuários reais, análises completas, cliques atribuídos, conversões e receita.

A prioridade não é volume de conteúdo. É validar aquisição e comportamento do funil e, separadamente, monetização quando houver oferta comercialmente apta.

## Objetivo

Construir uma operação diária que conecte:

`demanda real → conteúdo → aprovação humana → publicação → sessão → análise → recomendação`

Quando o gate comercial estiver aprovado, a cadeia poderá continuar para:

`clique atribuído → conversão → receita`

O banco da Zafi permanece como fonte oficial. Search Console e GA4 são fontes complementares.

## Escopo da primeira fase

O agente poderá analisar dados; identificar temas; escolher páginas e ofertas; criar roteiros, legendas, CTAs e UTMs; preparar calendário; submeter peças para aprovação; registrar publicação real; acompanhar o funil; e emitir relatório auditável.

O agente não poderá publicar, enviar mensagens ou gastar dinheiro sozinho nesta fase.

## Fluxo obrigatório

1. Coletar dados reais.
2. Classificar a campanha como educativa ou comercial.
3. Aplicar o gate correspondente e criar a campanha.
4. Submeter tema, peça, canal e horário a uma pessoa autorizada.
5. Registrar aprovação ou rejeição.
6. A pessoa autorizada realiza a publicação.
7. Registrar a publicação real.
8. Medir funil e atribuição.
9. Emitir o relatório das 18h.

Silêncio nunca representa aprovação.

## Gates independentes

Uma campanha educativa poderá ser classificada como `acquisition_ready` quando possuir página disponível, UTMs exclusivas, tracking operacional, compliance e aprovação humana. A ausência de oferta remunerada não bloqueia essa validação.

O status `blocked_commercial` aplica-se somente a peças que promovam parceiro, produto, oferta específica ou receita sem remuneração confirmada.

## Gate comercial

Antes de encaminhar uma campanha para publicação, deve existir ao menos uma oferta com:

- parceiro, produto, campanha e integração ativos;
- destino HTTPS validado;
- parâmetros de atribuição preservados;
- modelo de remuneração confirmado;
- valor ou percentual e moeda registrados;
- fonte e data da confirmação;
- condições de conversão e aprovação documentadas.

Se o gate falhar, somente a campanha comercial será marcada como `blocked_commercial`. Uma campanha puramente educativa poderá seguir para aprovação humana como `acquisition_ready`.

## Dados de entrada

- páginas publicadas e necessidades;
- ofertas comercialmente aptas do Atlas;
- eventos e snapshots do Cockpit;
- Search Console e GA4;
- marca, compliance e canais autorizados;
- orçamento aprovado, quando existir;
- biblioteca visual e logotipo;
- metas da baseline.

Dados ausentes serão marcados como indisponíveis. Nenhum placeholder será tratado como dado real.

## Entrega das 10h

- tema e hipótese;
- público e necessidade;
- página e oferta elegível;
- canal;
- roteiro vertical de 20 a 30 segundos;
- legenda;
- CTA;
- UTM exclusiva por canal;
- justificativa com fonte, período e números;
- estado do gate e da aprovação.

## Padrão de UTM

- `utm_source`: canal real;
- `utm_medium=organic_social`;
- `utm_campaign=baseline_100`;
- `utm_content`: data, tema e formato;
- `utm_term`: apenas com segmentação declarada.

Cada canal deve receber link diferente. A UTM precisa permanecer ligada à sessão, Recommendation Run, decisão, clique e receita.

## Entrega das 18h — aquisição

- alcance, quando disponível;
- usuários e sessões válidas;
- análises iniciadas e concluídas;
- origem dos usuários;
- cobertura de atribuição;
- principal perda e falhas;

## Entrega das 18h — monetização

- recomendações exibidas;
- cliques atribuídos;
- conversões;
- receita criada, aprovada e paga;
- custo real, quando houver;
- estado do gate comercial;
- até três ações para o próximo dia no relatório consolidado.

Sem oferta apta, registrar: **Monetização ainda não validada por ausência de oferta comercialmente apta.**

Testes, auditorias e administradores devem ser separados dos usuários reais.

## Compliance

O agente não pode prometer aprovação; garantir desconto, score ou limpeza rápida; inventar depoimentos ou números; divulgar dados pessoais; fazer spam; alterar ofertas ou regras financeiras; considerar clique como receita; misturar estados da receita; ou alterar Atlas, ranking, pesos, elegibilidade ou Recommendation Engine.

## Interrupção

Pausar diante de perda de UTM, cobertura inferior a 90%, mistura de testes, erro na análise, comunicação inadequada, dados pessoais expostos ou divergência entre banco e Cockpit. Ausência de remuneração pausa somente campanha comercial.

## Primeira campanha

- Tema: “Qual dívida pagar primeiro?”
- Formato: vídeo vertical de 20 a 30 segundos.
- CTA: diagnóstico gratuito da Zafi.
- Canais previstos: Instagram Reels, Facebook e WhatsApp.
- Campanha UTM: `baseline_100`.

### Meta do primeiro ciclo — 72 horas após a primeira publicação

- 20 visitantes válidos;
- 5 análises iniciadas;
- 2 análises completas;
- identificação do principal abandono;
- cobertura superior a 90%.

Esses valores são metas, não resultados existentes.

## Situação inicial

O Search Console apresentou sinais para renegociação de dívidas, especialmente Itaú e Santander, além de páginas sobre limpar o nome e organização de dívidas. A amostra continua insuficiente para declarar vencedor.

Na auditoria comercial de 19 de julho de 2026, as ofertas estavam com remuneração pendente. Isso mantém campanhas comerciais bloqueadas, mas não impede campanhas educativas. A primeira campanha foi reclassificada como `acquisition_ready` e aguarda aprovação humana.

## Implementação

O agente reutilizável está em `.agents/skills/zafi-marketing-agent/`. Os registros versionados ficam em `docs/marketing/campaigns/`.

## Critérios de aceite

A OE será operacionalmente aprovada quando o agente conseguir gerar campanha com dados reais; produzir roteiro, legenda, CTA e UTM; encaminhar para aprovação; impedir publicação sem gate ou aprovação; registrar publicação real; acompanhar até clique e receita; emitir relatório auditável; e operar sem alterar motores financeiros.

O ciclo de aquisição poderá ser validado antes da monetização. Registro de publicação permanece pendente até aprovação e publicação reais; receita permanece não validada até existir oferta comercialmente apta.
