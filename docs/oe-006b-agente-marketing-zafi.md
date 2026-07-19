# OE-006B — Agente de Marketing Zafi

## Decisão executiva

Criar e iniciar o Agente de Marketing Zafi em modo supervisionado. O agente será responsável por planejar, produzir, submeter para aprovação e medir campanhas orientadas a usuários reais, análises completas, cliques atribuídos, conversões e receita.

A prioridade não é volume de conteúdo. É produzir campanhas mensuráveis que conduzam uma necessidade financeira real até uma oferta comprovadamente capaz de gerar receita.

## Objetivo

Construir uma operação diária que conecte:

`demanda real → conteúdo → aprovação humana → publicação → sessão → análise → recomendação → clique atribuído → conversão → receita`

O banco da Zafi permanece como fonte oficial. Search Console e GA4 são fontes complementares.

## Escopo da primeira fase

O agente poderá analisar dados; identificar temas; escolher páginas e ofertas; criar roteiros, legendas, CTAs e UTMs; preparar calendário; submeter peças para aprovação; registrar publicação real; acompanhar o funil; e emitir relatório auditável.

O agente não poderá publicar, enviar mensagens ou gastar dinheiro sozinho nesta fase.

## Fluxo obrigatório

1. Coletar dados reais.
2. Validar o gate comercial no Atlas.
3. Criar a campanha.
4. Submeter tema, peça, canal e horário a uma pessoa autorizada.
5. Registrar aprovação ou rejeição.
6. A pessoa autorizada realiza a publicação.
7. Registrar a publicação real.
8. Medir funil e atribuição.
9. Emitir o relatório das 18h.

Silêncio nunca representa aprovação.

## Gate comercial

Antes de encaminhar uma campanha para publicação, deve existir ao menos uma oferta com:

- parceiro, produto, campanha e integração ativos;
- destino HTTPS validado;
- parâmetros de atribuição preservados;
- modelo de remuneração confirmado;
- valor ou percentual e moeda registrados;
- fonte e data da confirmação;
- condições de conversão e aprovação documentadas.

Se o gate falhar, a campanha será marcada como `blocked_commercial`. O agente poderá preparar a peça, mas não solicitar nem realizar publicação.

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

## Entrega das 18h

- alcance, quando disponível;
- usuários e sessões válidas;
- análises iniciadas e concluídas;
- recomendações exibidas;
- cliques atribuídos;
- conversões;
- receita criada, aprovada e paga;
- custo real, quando houver;
- origem dos usuários;
- cobertura de atribuição;
- principal perda e falhas;
- até três ações para o próximo dia.

Testes, auditorias e administradores devem ser separados dos usuários reais.

## Compliance

O agente não pode prometer aprovação; garantir desconto, score ou limpeza rápida; inventar depoimentos ou números; divulgar dados pessoais; fazer spam; alterar ofertas ou regras financeiras; considerar clique como receita; misturar estados da receita; ou alterar Atlas, ranking, pesos, elegibilidade ou Recommendation Engine.

## Interrupção

Pausar diante de perda de UTM, clique fora de `/go`, clique sem decisão, cobertura inferior a 90%, duplicidade relevante, comunicação inadequada, oferta indisponível, remuneração não confirmada ou divergência entre banco e Cockpit.

## Primeira campanha

- Tema: “Qual dívida pagar primeiro?”
- Formato: vídeo vertical de 20 a 30 segundos.
- CTA: diagnóstico gratuito da Zafi.
- Canais previstos: Instagram Reels, Facebook e WhatsApp.
- Campanha UTM: `baseline_100`.

### Meta da primeira semana

- 100 visitantes válidos;
- 30 análises iniciadas;
- 15 análises completas;
- 5 cliques atribuídos;
- primeira conversão real;
- cobertura superior a 90%.

Esses valores são metas, não resultados existentes.

## Situação inicial

O Search Console apresentou sinais para renegociação de dívidas, especialmente Itaú e Santander, além de páginas sobre limpar o nome e organização de dívidas. A amostra continua insuficiente para declarar vencedor.

Na auditoria comercial de 19 de julho de 2026, as ofertas tecnicamente ativas estavam com remuneração pendente. A primeira campanha foi produzida, mas permanece em `blocked_commercial`, sem publicação.

## Implementação

O agente reutilizável está em `.agents/skills/zafi-marketing-agent/`. Os registros versionados ficam em `docs/marketing/campaigns/`.

## Critérios de aceite

A OE será operacionalmente aprovada quando o agente conseguir gerar campanha com dados reais; produzir roteiro, legenda, CTA e UTM; encaminhar para aprovação; impedir publicação sem gate ou aprovação; registrar publicação real; acompanhar até clique e receita; emitir relatório auditável; e operar sem alterar motores financeiros.

Até existir remuneração confirmada e uma publicação real, registro, acompanhamento completo e receita permanecem pendentes de validação operacional.
