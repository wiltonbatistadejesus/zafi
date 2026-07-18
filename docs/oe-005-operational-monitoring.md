# OE-005 — Monitoramento Operacional e Conciliação

## Objetivo

Monitorar a integridade da cadeia `Perfil → Recommendation Engine → impressão → clique → conversão → receita`, diagnosticar o ponto exato de interrupção e conciliar o estado financeiro com sua decisão de origem.

## Princípios

- o banco da Zafi permanece como fonte oficial da verdade;
- nenhum indicador é estimado;
- ausência de base é apresentada como `Sem base`;
- diagnósticos não modificam ranking, pesos, parceiros ou regras do Atlas;
- monitoramento e otimização permanecem responsabilidades separadas;
- snapshots operacionais são append-only e idempotentes.

## Descoberta da auditoria

A validação da OE-005 identificou uma falha anterior na função de coleta progressiva do Perfil Inteligente. O `upsert` utilizava um nome de coluna ambíguo, impedindo a criação do perfil e, por consequência, a execução do Recommendation Engine.

A correção troca a inferência ambígua pelas constraints explícitas das tabelas. Nenhuma informação financeira, regra de elegibilidade ou configuração do Atlas foi alterada.

## Monitor operacional

A função protegida `operational_monitor_snapshot` calcula a saúde das últimas 24 horas e persiste, no máximo, um snapshot por janela de cinco minutos.

Cada snapshot contém:

- estado geral da cadeia;
- índice de saúde;
- volume e cobertura por etapa;
- indicadores de qualidade;
- diagnósticos ativos;
- conciliação financeira;
- janela observada;
- versão do schema;
- chave de idempotência.

## Indicadores de qualidade

- cobertura Perfil → Motor;
- integridade das execuções com decisões;
- cobertura de impressões;
- integridade dos cliques no ledger;
- atribuição das conversões;
- conciliação financeira;
- integridade da Jornada do Perfil;
- entrega ao GA4 quando existe consentimento.

Percentuais somente são calculados quando existe denominador real. Sem atividade suficiente, o indicador permanece neutro.

## Diagnósticos automáticos

O monitor detecta:

- perfil financeiro sem execução posterior do motor;
- execução do motor sem decisões auditáveis;
- recomendação elegível sem impressão;
- clique de telemetria sem registro afiliado;
- clique afiliado ausente no ledger de atribuição;
- conversão sem execução ou decisão de origem;
- divergência de estado, comissão ou moeda;
- divergência entre clique, parceiro, campanha e decisão;
- postback rejeitado;
- evento ausente na Jornada do Perfil;
- entrega consentida sem confirmação do GA4;
- conversão pendente há mais de sete dias.

Cada diagnóstico informa código, etapa, severidade, título, quantidade e explicação operacional.

## Conciliação financeira

A view protegida `financial_reconciliation_current` compara cada conversão com:

- clique original;
- execução e decisão do Recommendation Engine;
- parceiro e campanha preservados na decisão;
- último evento recebido da rede;
- último evento financeiro do ledger;
- estado esperado;
- comissão;
- moeda.

Uma conversão somente é considerada conciliada quando todos esses vínculos são consistentes.

Os estados esperados são:

- `pending → created`;
- `approved → approved`;
- `paid → paid`;
- `rejected/cancelled → reversed`.

## Persistência e idempotência

A tabela `operational_monitor_snapshots` é append-only. A chave combina versão, duração da janela e bloco de cinco minutos.

Consultas repetidas dentro do mesmo bloco retornam o mesmo identificador, sem criar snapshots duplicados.

## CEO Cockpit

O Cockpit passa a mostrar:

- índice de saúde operacional;
- estado geral da cadeia;
- seis etapas conectadas visualmente;
- volume e cobertura de cada etapa;
- oito indicadores de qualidade;
- diagnósticos priorizados;
- conversões conciliadas e divergentes;
- postbacks aceitos, repetidos e rejeitados;
- conversões pendentes antigas;
- ações executivas derivadas dos problemas reais.

O painel é atualizado pela frequência já existente do Cockpit. A leitura é calculada ao vivo, enquanto o histórico é consolidado em intervalos idempotentes de cinco minutos.

## Critérios operacionais

- `healthy`: existe base e nenhuma ruptura foi detectada;
- `attention`: existe perda de cobertura, rejeição externa ou pendência que exige acompanhamento;
- `critical`: existe quebra de integridade, registro órfão ou divergência financeira;
- `neutral`: ainda não existe base suficiente para avaliação.

O índice de saúde não é apresentado quando não existe atividade operacional suficiente.

## Limites desta fase

- nenhuma regra do Atlas foi alterada;
- nenhum peso foi alterado;
- nenhum parceiro foi incluído, removido ou priorizado;
- o ranking não utiliza métricas financeiras;
- nenhuma otimização automática foi implementada;
- nenhum modelo de IA ou machine learning foi adicionado;
- o monitor apenas observa, diagnostica, concilia e informa.

## Validação

O teste transacional cobre:

1. coleta progressiva do perfil;
2. execução do Recommendation Engine;
3. persistência da impressão;
4. registro do clique;
5. conversão pendente;
6. conversão aprovada;
7. conversão paga;
8. conciliação entre conversão e ledger;
9. snapshot operacional;
10. repetição idempotente do snapshot.

Os testes são revertidos integralmente e não deixam dados fictícios no banco.
