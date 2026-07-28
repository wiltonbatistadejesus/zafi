# OE-008 — Autonomous Content Factory

## Status

**APROVADA pelo CEO em 25/07/2026.**

O protótipo operacional, a arquitetura desacoplada, o painel CEO Review e os três pilotos foram aceitos como entrega da OE-008.

North Star: **100 visitantes orgânicos por dia**.

Nenhuma publicação automática foi implementada.

A aprovação desta Ordem Executiva não aprova individualmente a publicação dos vídeos. Cada ativo continuará exigindo aprovação humana específica de roteiro, versão, canal, perfil, data, horário e link mensurável antes de qualquer distribuição.

## Arquitetura

Fluxo:

`Trend Hunter → Content Strategist → Script Writer → Avatar Director → Video Producer → Thumbnail Producer → Quality Reviewer → Compliance Reviewer → CEO Review`

O Video Producer depende somente do contrato `VideoProvider`:

- `generate()`;
- `status()`;
- `preview()`;
- `download()`;
- `cancel()`.

O primeiro adaptador é `local-motion-v1`, responsável pelo preview vertical da própria Zafi com locução pt-BR disponível no navegador. O núcleo não possui regra específica de CapCut, TalkGen, Veo ou Runway.

## Governança

- todo conteúdo permanece em `draft` até concluir as revisões;
- somente pacotes sem bloqueios chegam a `pending_approval`;
- o CEO pode aprovar, solicitar ajustes ou rejeitar;
- a decisão do CEO não publica o conteúdo;
- publicação, mídia paga e distribuição continuam fora do escopo;
- Atlas, Recommendation Engine, ranking, pesos, elegibilidade, diagnóstico e lógica financeira não foram alterados.

## Brand Bible

A fonte única da identidade editorial está em `docs/marketing/brand/brand-bible.md`.

Todos os módulos devem usar automaticamente logo, cores, tipografia, slogan, voz, CTA e regras de compliance.

## Laboratório criativo

Cada piloto possui:

- três hooks;
- dois CTAs;
- três thumbnails;
- dois estilos de edição;
- roteiro e descrição;
- direção de voz e avatar;
- score detalhado;
- revisão de compliance;
- fornecedor, tempo e custo estimado;
- rastreabilidade de pesquisa, briefing, roteiro e ativo.

## Piloto 1 — Institucional

**Título:** Antes de decidir, entenda.

**Objetivo:** apresentar a Zafi como diagnóstico e orientação, não como vitrine de ofertas.

**Hook selecionado:** Antes de aceitar qualquer proposta, entenda sua situação.

**Roteiro:**

Antes de aceitar qualquer proposta, entenda sua situação. A Zafi organiza suas dívidas, mostra o que merece prioridade e cria um plano simples para o próximo passo. Sem prometer atalhos e sem empurrar ofertas. Comece pelo diagnóstico financeiro gratuito da Zafi.

**CTA:** Faça o diagnóstico financeiro gratuito da Zafi.

**Score:** 94/100.

**Fornecedor:** Zafi Motion Preview (`local-motion-v1`).

**Tempo de geração:** 180 ms.

**Custo estimado:** R$ 0,00.

## Piloto 2 — Educacional

**Título:** Qual dívida pagar primeiro?

**Objetivo:** ensinar uma regra simples e levar ao diagnóstico sem prometer resultado.

**Hook selecionado:** A menor dívida nem sempre deve ser paga primeiro.

**Roteiro:**

A menor dívida nem sempre deve ser paga primeiro. Comece olhando três coisas: juros, risco de perder um serviço essencial e impacto no seu orçamento. Cartão e cheque especial costumam crescer rápido, mas cada caso é diferente. A Zafi organiza essas informações para você. Faça o diagnóstico financeiro gratuito.

**CTA:** Organize suas dívidas e descubra sua próxima prioridade.

**Score:** 96/100.

**Fornecedor:** Zafi Motion Preview (`local-motion-v1`).

**Tempo de geração:** 210 ms.

**Custo estimado:** R$ 0,00.

## Piloto 3 — Viral

**Título:** A dívida pequena que cresce escondida.

**Objetivo:** gerar atenção e compartilhamento com utilidade, sem alarmismo.

**Hook selecionado:** Tem dívida que cresce enquanto parece parada.

**Roteiro:**

Tem dívida que cresce enquanto parece parada. Quando os juros são altos, esperar pode mudar bastante o valor final. Antes de pagar por impulso, compare juros, prazo e impacto no orçamento. Salve este vídeo e organize tudo no diagnóstico gratuito da Zafi.

**CTA:** Salve este vídeo e faça o diagnóstico gratuito da Zafi.

**Score:** 91/100.

**Fornecedor:** Zafi Motion Preview (`local-motion-v1`).

**Tempo de geração:** 165 ms.

**Custo estimado:** R$ 0,00.

## CEO Review

Painel protegido: `/admin/content-factory`.

O painel apresenta preview com locução, tema, objetivo, score, roteiro, descrição, CTAs, três thumbnails, estilos, fornecedor, tempo, custo, qualidade e compliance.

As decisões do protótipo são salvas no navegador utilizado para a avaliação. Elas não publicam nem alteram qualquer motor financeiro.

## Aprendizado

Após publicação manual futura, o ciclo deverá registrar:

- visualizações;
- retenção;
- CTR;
- compartilhamentos;
- visitas atribuídas;
- diagnósticos iniciados;
- diagnósticos concluídos.

Somente resultados reais e atribuídos poderão influenciar as próximas priorizações.

## Critério de aceite

- nove módulos especializados possuem skill, contrato e aceite;
- o VideoProvider está desacoplado;
- Brand Bible central criada;
- laboratório criativo implementado;
- CEO Review protegido implementado;
- três pilotos completos entregues;
- publicação automática permanece impossível;
- nenhuma alteração ocorreu nos motores financeiros da Zafi.
