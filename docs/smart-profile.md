# OE-002 — Perfil Inteligente da Zafi

## Arquitetura

O perfil possui uma raiz pseudonimizada por `visitor_id` e cinco blocos independentes:

1. **Identidade** — nome, e-mail, telefone futuro e localidade.
2. **Consentimentos** — histórico append-only por finalidade, decisão, versão da política e origem.
3. **Contexto Financeiro** — dívida primeiro; renda e estimativa somente na etapa final.
4. **Jornada** — preenchida automaticamente por eventos de telemetria e conversão, sem formulário.
5. **Perfil Inteligente** — campos nulos preparados para Score Zafi, probabilidade de conversão, interesses e extensões versionadas.

Não há modelo preditivo, inferência ou valor simulado nesta fase. Eventos anteriores à criação do perfil são vinculados por `visitor_id` no primeiro registro, sem tentar relacionar cadastros legados que não possuam esse identificador.

## Coleta progressiva

| Momento | Dados | Intervenção |
|---|---|---|
| Banner de privacidade | escolha de analytics | escolha isolada e opcional |
| Cadastro das dívidas | total, quantidade, tipos e credores informados | primeira etapa financeira |
| Simulação final | renda, nome e e-mail | etapa posterior |
| Consentimento de relacionamento | aceito ou recusado | escolha opcional na etapa final |
| Navegação, análise, clique e conversão | Jornada | automática |

## Finalidade por campo

O catálogo executável está em `lib/profile/schema.ts`. Ele classifica todos os campos de negócio e rastreabilidade em personalização, relacionamento, monetização, analytics ou conformidade. Identificadores, datas, versões e origens existem para conformidade/auditoria; `created_at` e `updated_at` registram criação e atualização; `schema_version` sustenta evolução compatível. Os mesmos propósitos estão documentados nos comentários do banco.

## LGPD e segurança

- consentimentos nunca são sobrescritos; cada mudança aponta para o registro anterior;
- consentimento analítico e de relacionamento são separados;
- recusa não bloqueia a análise;
- tabelas têm RLS, acesso direto revogado e escrita apenas pela camada servidor;
- Jornada guarda somente contexto mínimo e referência ao evento original;
- a API aceita atualização ou retirada futura de consentimento;
- `phone` e atributos inteligentes existem apenas como capacidade estrutural e permanecem nulos.

## Evolução para IA

Uma futura camada de cálculo poderá consumir contexto financeiro + Jornada e gravar resultados versionados no bloco `profile_intelligence`. O perfil separa fatos informados, fatos observados e atributos inferidos, permitindo auditoria, recálculo e explicação antes de qualquer uso em recomendação.
