# Operação de Aquisição Controlada — Baseline Zafi

## 1. Decisão executiva

A Zafi entrou oficialmente em fase de aquisição controlada em **19 de julho de 2026, às 04:00, horário de Brasília**.

O objetivo desta fase não é desenvolver novas funcionalidades. É colocar usuários reais no funil existente, observar o comportamento com dados auditáveis e descobrir onde a operação funciona ou quebra.

Durante a coleta da baseline ficam congelados:

- Atlas Core;
- regras de elegibilidade;
- Recommendation Engine;
- ranking;
- pesos;
- regras específicas de parceiros.

## 2. Fonte oficial da verdade

O banco da Zafi permanece como fonte oficial. GA4 e Search Console são fontes complementares.

A cadeia auditável utilizada será:

Origem ou UTM → evento de entrada → visitante e sessão → análise → Recommendation Engine → impressão → clique `/go` → conversão → receita criada, aprovada e paga.

Uma receita só será atribuída quando puder ser ligada ao clique, à decisão e à execução original do Recommendation Engine.

## 3. Separação da baseline

Somente eventos ocorridos após o início oficial entram nas metas.

Ficam excluídos:

- eventos com origem `audit`;
- eventos com origem `oe0051`;
- páginas contendo `telemetry_test`;
- páginas contendo `zafi_ga_debug`;
- páginas administrativas;
- testes operacionais identificados;
- cliques controlados de auditoria.

Essa separação evita que testes anteriores sejam tratados como aquisição real.

## 4. Situação anterior à baseline

Após retirar auditorias e testes identificáveis, a amostra anterior contém:

- 4 sessões com visualização de página;
- 2 sessões com análise iniciada;
- 2 análises completas;
- 2 sessões com clique em parceiro;
- 1 clique conectado à atribuição da OE-004;
- nenhuma conversão;
- nenhuma receita criada, aprovada ou paga.

A cobertura histórica observável entre os dois cliques e a atribuição da OE-004 é de 50%. Parte desse tráfego ocorreu antes da ativação da arquitetura de atribuição, portanto ele não será usado para avaliar a baseline nova.

Nenhuma conclusão comercial pode ser extraída desses números.

## 5. Baseline orgânica do Google

O sitemap oficial está processado no Search Console:

- sitemap: `https://meuzafi.com.br/sitemap.xml`;
- status: processado;
- URLs encontradas: 32;
- última leitura observada: 16 de julho de 2026;
- robots.txt: acesso permitido;
- relatório de indexação: ainda em processamento.

Desempenho inicial observado entre 13 e 16 de julho de 2026:

- 11 impressões;
- 1 clique;
- CTR média de 9,1%;
- posição média de 22,8.

Consultas iniciais observadas:

- renegociação Itaú;
- Zafi;
- Itaú dívidas;
- Santander negociar dívida.

Esse é um sinal inicial, não uma amostra suficiente.

## 6. Páginas prioritárias

As primeiras páginas escolhidas já existem, respondem a necessidades financeiras reais e começaram a receber impressões no Google.

1. `https://meuzafi.com.br/oraculo/bancos/como-negociar-divida-itau`
2. `https://meuzafi.com.br/oraculo/renegociacao/como-funciona-acordo-certo`
3. `https://meuzafi.com.br/como-limpar-o-nome`
4. `https://meuzafi.com.br/oraculo/bancos/como-negociar-divida-santander`
5. `https://meuzafi.com.br/como-organizar-dividas`

Todas possuem orientação educativa e CTA para o diagnóstico da Zafi.

Não serão criadas dezenas de páginas durante esta coleta. Primeiro será medido o desempenho do acervo existente.

## 7. Metas mínimas

A baseline somente poderá ser encerrada quando todos os critérios forem atendidos:

- 100 análises completas reais;
- 30 cliques atribuídos;
- primeira conversão real;
- cobertura de atribuição superior a 90%;
- abandono registrado entre as etapas do funil;
- receita separada em criada, aprovada e paga.

Até atingir esses volumes, os relatórios deverão usar expressões como “sinal inicial”, “amostra insuficiente” e “hipótese”.

## 8. Convenção oficial de UTMs

### utm_source

Identifica a origem específica:

- `google`;
- `whatsapp`;
- `instagram`;
- `facebook`;
- nome do parceiro de referência.

### utm_medium

- `organic_search`;
- `organic_social`;
- `referral`;
- `email`, somente para contatos com consentimento.

### utm_campaign

Campanha inicial fixa:

`baseline_100`

### utm_content

Identifica a peça ou CTA, usando letras minúsculas e sublinhado.

Exemplos:

- `diagnostico_direto`;
- `guia_limpar_nome`;
- `guia_itau`;
- `guia_santander`;
- `guia_organizar_dividas`.

### utm_term

Será usado apenas quando houver palavra-chave ou segmentação declarada.

## 9. Links mensuráveis iniciais

### Diagnóstico direto via WhatsApp

`https://meuzafi.com.br/?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=diagnostico_direto`

### Guia para limpar o nome via Instagram

`https://meuzafi.com.br/como-limpar-o-nome?utm_source=instagram&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=guia_limpar_nome`

### Guia Itaú via Facebook

`https://meuzafi.com.br/oraculo/bancos/como-negociar-divida-itau?utm_source=facebook&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=guia_itau`

### Guia Santander via WhatsApp

`https://meuzafi.com.br/oraculo/bancos/como-negociar-divida-santander?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=guia_santander`

### Organização de dívidas por referência

`https://meuzafi.com.br/como-organizar-dividas?utm_source=parceiro&utm_medium=referral&utm_campaign=baseline_100&utm_content=guia_organizar_dividas`

O valor `parceiro` deverá ser substituído pelo identificador real de cada fonte antes da divulgação.

## 10. Conteúdos de distribuição

### WhatsApp — diagnóstico direto

Está difícil saber qual dívida pagar primeiro? A Zafi organiza as informações, mostra um diagnóstico e ajuda a comparar os próximos passos sem custo. O objetivo é orientar antes de apresentar qualquer parceiro.

Link:

`https://meuzafi.com.br/?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=diagnostico_direto`

### Instagram — limpar o nome

Limpar o nome começa antes do acordo. Primeiro você precisa confirmar a dívida, proteger as despesas essenciais e entender qual parcela realmente cabe no orçamento. A Zafi preparou um guia gratuito e um diagnóstico para ajudar nessa decisão.

Link:

`https://meuzafi.com.br/como-limpar-o-nome?utm_source=instagram&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=guia_limpar_nome`

### Facebook ou comunidade — dívida Itaú

Antes de renegociar uma dívida com o Itaú, anote o saldo, os atrasos e o valor máximo que cabe no mês. Compare prazo e custo total, não apenas o desconto. Este guia da Zafi reúne os passos e os canais oficiais.

Link:

`https://meuzafi.com.br/oraculo/bancos/como-negociar-divida-itau?utm_source=facebook&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=guia_itau`

### WhatsApp — dívida Santander

Se você precisa negociar uma dívida com o Santander, organize primeiro sua capacidade de pagamento e consulte somente os canais oficiais. A Zafi reuniu um roteiro gratuito para fazer isso com mais segurança.

Link:

`https://meuzafi.com.br/oraculo/bancos/como-negociar-divida-santander?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=baseline_100&utm_content=guia_santander`

Nenhuma publicação deve prometer aprovação, desconto garantido, aumento de score ou saída rápida das dívidas.

## 11. Canais autorizados nesta fase

Prioridade:

1. Google orgânico;
2. compartilhamento orgânico em WhatsApp;
3. Instagram orgânico;
4. Facebook e comunidades relevantes, sem spam;
5. referências mensuráveis de parceiros ou pessoas autorizadas.

Mídia paga não será iniciada sem orçamento e autorização específicos. E-mail somente poderá ser usado com base consentida.

## 12. Funil diário

O relatório diário deverá apresentar:

1. sessões válidas;
2. análises iniciadas;
3. análises completas;
4. impressões de recomendações;
5. cliques atribuídos;
6. conversões criadas;
7. conversões aprovadas;
8. conversões pagas;
9. receita criada;
10. receita aprovada;
11. receita paga.

O abandono será calculado entre cada etapa, sempre por sessões ou execuções únicas, evitando duplicidade de eventos.

## 13. Cobertura de atribuição

A cobertura será calculada como:

`cliques com run_id e decision_id ÷ cliques elegíveis × 100`

Para conversões:

`conversões com clique, run_id e decision_id ÷ conversões totais × 100`

A cobertura precisa permanecer acima de 90%. Um resultado inferior gera alerta e interrompe qualquer conclusão sobre canal, página ou parceiro.

## 14. Acompanhamento no Cockpit

O CEO Cockpit continuará consultando snapshots automáticos gerados no servidor a cada cinco minutos. Uma revisão executiva deverá ocorrer diariamente às 18:00, horário de Brasília.

O resumo diário terá:

- origem e campanha;
- página de entrada;
- sessões;
- análises iniciadas e completas;
- abandono por etapa;
- impressões e cliques atribuídos;
- cobertura de atribuição;
- conversões;
- receita por estado financeiro;
- falhas de tracking;
- três ações prioritárias, no máximo.

## 15. Regras de decisão

- Não declarar uma página vencedora antes de 30 análises iniciadas provenientes dela.
- Não declarar um canal vencedor antes de 30 cliques atribuídos no conjunto da baseline.
- Não alterar ranking ou pesos com base em CTR isolado.
- Não confundir clique com conversão.
- Não tratar receita criada como receita aprovada ou paga.
- Não usar testes, auditorias ou acessos administrativos como usuários reais.
- Não aumentar investimento quando a cobertura de atribuição estiver abaixo de 90%.

## 16. Alertas de interrupção

A coleta deverá ser revisada imediatamente quando ocorrer:

- clique de parceiro sem passagem pela rota `/go`;
- clique sem `run_id` ou `decision_id`;
- conversão sem clique original;
- cobertura inferior a 90%;
- eventos duplicados;
- snapshot automático atrasado;
- perda de UTMs na entrada;
- receita sem estado financeiro;
- divergência entre banco e Cockpit.

## 17. Estado da operação

### Ativo

- sitemap processado;
- primeiras impressões orgânicas registradas;
- páginas educativas publicadas;
- CTAs para o diagnóstico existentes;
- telemetria persistente ativa;
- identidade de visitante e sessão ligada ao Recommendation Engine;
- snapshots automáticos ativos;
- separação financeira preparada.

### Pendente de volume real

- 100 análises completas;
- 30 cliques atribuídos;
- primeira conversão real;
- validação sustentada de cobertura superior a 90%;
- comparação confiável entre canais e páginas.

### Dependência externa

A Zafi já pode receber tráfego orgânico do Google. Para iniciar distribuição em WhatsApp, Instagram, Facebook ou parceiros, os links mensuráveis precisam ser publicados por uma conta autorizada da empresa. Nenhuma postagem externa foi realizada sem acesso ou autorização do respectivo canal.

## 18. Resultado esperado

Esta operação não busca confirmar uma tese previamente escolhida. Ela busca produzir uma amostra mínima confiável para responder:

- quais necessidades geram visitas qualificadas;
- quais páginas iniciam análises;
- onde as pessoas abandonam;
- quais recomendações recebem cliques;
- quais cliques geram conversões;
- qual receita foi apenas criada, qual foi aprovada e qual foi efetivamente paga.

Até que as metas mínimas sejam atingidas, a resposta oficial será: **baseline em coleta; amostra insuficiente para conclusão**.
