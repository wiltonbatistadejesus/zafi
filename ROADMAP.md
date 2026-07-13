# Roadmap estratégico — Zafi

Atualizado em 13 de julho de 2026.

## Visão

Construir a plataforma brasileira mais confiável para pessoas que querem sair das dívidas. Toda iniciativa deve aumentar confiança, conversão, receita ou autoridade orgânica, ou reduzir abandono.

## Status das sprints

### Sprint 1 — Confiança

Status: concluída.

- Diagnóstico financeiro personalizado.
- Plano de ação da Zafi.
- Explicação do motivo de cada recomendação.
- Cards de parceiros orientados à decisão.
- Caminhos adicionais de ajuda.

### Sprint 2 — Motor inteligente de recomendação

Status: primeira versão concluída; evolução contínua.

- Ordenação de parceiros pelo perfil financeiro.
- Priorização de renegociação antes de novo crédito.
- Recomendações explicáveis e independentes da comissão.

### Sprint 3 — SEO

Status: concluída.

- Arquitetura escalável de páginas estáticas.
- Hub de guias e cluster inicial de conteúdo.
- Metadados, URLs canônicas, sitemap e robots.txt.
- Dados estruturados e interligação interna.
- Conteúdo centralizado para expansão sem duplicação.

### Sprint 4 — PROJETO ORÁCULO

Status: Fase 1 concluída; arquitetura da Fase 4.1 concluída.

Objetivo: criar a Base de Conhecimento Estruturada da Zafi, preparada para SEO e GEO, capaz de alimentar páginas, ferramentas e respostas consistentes para Google, Gemini, ChatGPT e demais mecanismos de IA.

#### Escopo

- Modelo central de entidades, conceitos, perguntas, respostas, fontes e relações.
- FAQs verificáveis e reutilizáveis.
- Schema.org adequado a cada tipo de conteúdo.
- Páginas especializadas por intenção, dívida, credor e situação financeira.
- Ferramentas e calculadoras conectadas à base de conhecimento.
- Interligação interna orientada por relações semânticas.
- Autoria, fontes, data de revisão e histórico de atualização.
- Conteúdo legível por pessoas e facilmente interpretável por mecanismos de IA.
- Processo editorial para evitar conteúdo raso, duplicado ou contraditório.

#### Critérios de conclusão

- Existe uma fonte central e tipada de conhecimento.
- Cada afirmação sensível pode registrar fonte e data de revisão.
- FAQs, páginas e dados estruturados são derivados da mesma base.
- Entidades relacionadas geram links internos automaticamente.
- O sistema suporta novos conteúdos sem duplicar estrutura ou lógica.
- Um conjunto inicial de conhecimento está publicado e validado em produção.

#### Fase 1 — infraestrutura do conhecimento

- Hub `/oraculo` e seis categorias permanentes.
- Template reutilizável com resposta direta, fontes e data de revisão.
- Dez páginas-modelo publicadas a partir de uma base central tipada.
- Breadcrumbs visuais e `BreadcrumbList` estruturado.
- `Article`, `FAQPage`, `WebPage`, Open Graph e JSON-LD.
- Links internos automáticos e rotas incluídas no sitemap.

#### Sprint 4.1 — Entity Database

Status: arquitetura concluída; migração não aplicada em produção.

- Knowledge Graph híbrido projetado sobre PostgreSQL.
- Registro extensível de entidades e relacionamentos.
- Afirmações atômicas com fontes, validade e confiança.
- Especializações para instituições, produtos, conteúdo, perguntas, ferramentas e parceiros.
- Histórico de versões e governança editorial.
- Camada de páginas como projeção do grafo.
- Schema privado, RLS e privilégios mínimos.
- Contratos TypeScript para a futura camada de recuperação da IA.
- Estratégia documentada para escala, SEO, GEO, JSON-LD e links internos.

Próximo marco: aplicar e validar a migração em um ambiente de staging antes de conectar conteúdo ou páginas públicas.

#### Zafi AI Index

Status: planejado após a validação da Entity Database.

Páginas estruturadas por banco reunirão informações, FAQs, dados atualizados, ferramentas, glossário e fontes. Serão projeções do Knowledge Graph, sem duplicar a base canônica.

### Sprint 5 — IA personalizada

Status: planejada.

- Consultora financeira baseada no ORÁCULO.
- Explicações personalizadas antes de qualquer recomendação.
- Respostas consistentes, rastreáveis e seguras.

### Sprint 6 — Analytics e otimização

Status: planejada.

- Funil completo e eventos de conversão.
- Testes A/B.
- Medição de confiança, abandono, cliques e receita.
- Ciclo contínuo de melhoria.

## Academia Zafi

Status: adiada para sprint futura.

A Academia será replanejada depois da consolidação do ORÁCULO. A base estruturada servirá como fonte para cursos, trilhas, aulas e materiais educativos, evitando conteúdo isolado ou inconsistente.
