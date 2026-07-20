# OE-006C — Separação dos Gates de Aquisição e Monetização

## Decisão executiva

Separar imediatamente a validação de aquisição da validação comercial e de receita no Agente de Marketing Zafi.

A ausência de oferta remunerada não bloqueia campanhas educativas destinadas a validar tráfego, diagnóstico e comportamento do funil. Campanhas que promovam parceiro, produto, oferta ou monetização específica permanecem bloqueadas até a confirmação formal da remuneração.

## Evidência de partida

Em 19 de julho de 2026, a Zafi possuía zero usuários válidos, sessões, análises iniciadas, cliques atribuídos e receita na baseline. Não havia oferta comercialmente apta e nenhuma campanha havia sido publicada. Tracking, UTMs, agente e monitoramento estavam implementados.

O bloqueio comercial global impedia dois experimentos independentes: aquisição e monetização.

## Fluxos separados

### Aquisição

`conteúdo educativo → sessão atribuída → diagnóstico → Recommendation Run → comportamento`

### Monetização

`recomendação → clique comercial → conversão → receita criada → receita aprovada → receita paga`

O primeiro fluxo pode ser validado sem oferta remunerada. O segundo só será considerado válido após aprovação do gate comercial.

## Classificação

### acquisition_ready

Campanha educativa apta para aprovação humana quando possuir conteúdo compatível com compliance, página disponível, UTM exclusiva por canal, tracking operacional, ausência de promessa financeira e nenhuma oferta específica apresentada como remunerada.

### blocked_commercial

Campanha comercial que promove parceiro, produto, oferta ou receita sem remuneração, moeda, valor ou percentual e condições de aprovação formalmente documentados.

### commercial_ready

Campanha comercial apta para aprovação humana quando parceiro, produto, campanha, integração, destino, atribuição, remuneração, moeda, valor ou percentual, condições, fonte, data e aprovação estiverem documentados.

## Implementação realizada

1. Removido o bloqueio comercial global das campanhas educativas.
2. Campanha “Qual dívida pagar primeiro?” reclassificada como `acquisition_ready`.
3. Aprovação humana preservada como obrigatória.
4. `blocked_commercial` limitado a campanhas comerciais.
5. Ofertas sem remuneração não são apresentadas como fonte de receita.
6. Diagnóstico e orientação educativa permanecem disponíveis.
7. Relatórios separados entre aquisição e monetização.
8. Análise, recomendação e clique continuam sem classificação de receita.
9. Atlas, ranking, pesos, elegibilidade, Recommendation Engine, regras financeiras, ofertas e integrações não foram alterados.

## Primeira publicação autorizável

- Campanha: “Qual dívida pagar primeiro?”
- Objetivo: validar aquisição e conclusão do diagnóstico.
- Canais: Instagram Reels, Facebook e WhatsApp.
- CTA: “Faça o diagnóstico financeiro gratuito da Zafi.”
- Mídia paga: não autorizada.

A publicação depende de confirmação humana de roteiro, legenda, perfil, canal, data, horário e link UTM.

## Primeiro ciclo

Prazo: 72 horas após a primeira publicação.

- 20 visitantes válidos;
- pelo menos 5 análises iniciadas;
- pelo menos 2 análises concluídas;
- identificação do principal abandono;
- cobertura de atribuição superior a 90%.

Conversão e receita não são critérios de aprovação deste ciclo.

## Interrupção

Pausar diante de perda de UTM, cobertura inferior a 90%, mistura de testes, erro de análise, comunicação incompatível, exposição de dados pessoais, promessa financeira ou divergência relevante entre banco e Cockpit.

## Relatório das 18h

### Aquisição

Apresentar alcance, usuários, sessões, origem, análises iniciadas, análises concluídas, taxa de conclusão e principal abandono.

### Monetização

Apresentar recomendações, cliques atribuídos, conversões, receita criada, aprovada e paga e estado do gate comercial.

Quando não houver oferta remunerada, registrar: **Monetização ainda não validada por ausência de oferta comercialmente apta.**

Não registrar receita zero como falha de aquisição quando a monetização ainda não estiver habilitada.

## Critério de aceite

A OE-006C está implementada quando os gates estão separados, a campanha educativa está em `acquisition_ready`, campanhas comerciais continuam bloqueadas sem remuneração, a aprovação humana permanece obrigatória, os relatórios estão separados e nenhuma mudança ocorreu nos motores financeiros.
