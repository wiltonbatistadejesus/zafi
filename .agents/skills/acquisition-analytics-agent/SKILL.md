---
name: acquisition-analytics-agent
description: Consolidar banco da Zafi, CEO Cockpit, GA4, Search Console e Atlas para responder sobre canais, conteúdos, abandono, conversão, páginas e oportunidades com dados auditáveis. Usar em relatórios diários de aquisição e monetização; nunca estimar métricas nem alterar motores.
---

# Acquisition Analytics Agent

Produzir análise diária com o banco da Zafi como fonte oficial.

## Fluxo

1. Ler `references/contract.md`.
2. Definir janela, fuso e filtros para testes, auditorias e administradores.
3. Consultar o banco e Cockpit para funil, atribuição e receita.
4. Usar GA4 e Search Console como fontes complementares; usar Atlas apenas para estado comercial.
5. Separar aquisição de monetização conforme OE-006C.
6. Calcular cobertura somente com denominador maior que zero.
7. Responder melhor canal, conteúdo, abandono, conversão, páginas e oportunidades; usar `indisponível` quando não houver amostra.
8. Salvar em `docs/marketing/reports/` como versão auditável.

## Regras

- Não declarar vencedor com amostra insuficiente.
- Não publicar conteúdo, enviar mensagens ou comprar mídia.
- Não tratar clique, recomendação ou análise como receita.
- Separar receita criada, aprovada e paga.
- Não alterar Atlas, ranking, pesos, elegibilidade ou Recommendation Engine.

## Aceite

Aceitar quando toda métrica tiver fonte, janela, filtro, numerador, denominador quando aplicável e distinção entre zero e indisponível.
