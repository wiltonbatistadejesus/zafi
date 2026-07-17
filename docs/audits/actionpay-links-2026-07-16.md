# Auditoria Actionpay — Fase 1

Data do teste: 16/07/2026 (America/Sao_Paulo)  
Ambiente: produção — `https://meuzafi.com.br`  
Escopo: cadastro, redirecionamento, persistência, envio GA4 e leitura pelo Cockpit.  

## Inventário e resultado

| Parceiro | Campanha | `/go` / `partner_id` | URL afiliada completa | Ativo | Páginas | Remuneração | Link validado | Telemetria | Cockpit |
|---|---|---|---|---|---|---|---|---|---|
| Acordo Certo | Actionpay ref. 187558 — nome oficial pendente | `/go/acordo-certo` / `acordo-certo` | `https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount` | Sim | Resultado da análise (`/`) | Pendente de confirmação | Sim; resolveu para `turbinado.upone.link` | Correta: ID e nome próprios no Supabase e payload GA4 | Presente |
| SuperSim | SuperSim — Empréstimo Pessoal | `/go/super-sim` / `super-sim` | `https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount` | Sim | Resultado da análise (`/`) | Pendente de confirmação | Sim; destino SuperSim preservou `utm_source=actionpay` e `aff_sub` | Correta | Presente |
| FinanciaTudo | Produtos FinanciaTudo — link direto | `/go/financia-tudo` / `financia-tudo` | `https://financiatudo.com.br/produtos/chave/cadc009df0f513e09ac0d9ec33f3bd5f74b70fd3` | Sim | Resultado da análise (`/`) | Pendente de confirmação | Sim; destino final idêntico ao link cadastrado | Correta e isolada dos demais parceiros | Presente |
| Juros Baixos | Juros Baixos — Empréstimo pessoal | `/go/juros-baixos` / `juros-baixos` | `https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount` | Sim | Resultado da análise (`/`) | Pendente de confirmação | Sim; destino preservou `actionpay` e `aff_id=359422` | Correta | Presente |
| FinanZero | FinanZero — Empréstimos | `/go/finanzero` / `finanzero` | `https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount` | Sim | Resultado da análise (`/`) | Pendente de confirmação | Sim; destino final `finanzero.com.br` com parâmetros de afiliado | Correta | Presente |
| Bom Pra Crédito | Não validada — usava indevidamente o link da FinanZero | `/go/bom-pra-credito` / `bom-pra-credito` | Nenhuma URL liberada após a auditoria | Não | Nenhuma | Pendente de confirmação | Não; vínculo duplicado removido e rota bloqueada com HTTP 410 | Sem clique indevido após a correção | Ausente, como esperado |
| ConsigMais | ConsigMais — FGTS | `/go/consiga-mais` / `consiga-mais` | `https://apretailer.com.br/click/6a3f408d2bfa813ab73f7f94/184986/359422/subaccount` | Não | Nenhuma | Pendente de confirmação | Parcial; a Actionpay resolve para ConsigMais FGTS, mas o anunciante retornou `ERR_HTTP2_PROTOCOL_ERROR` | Clique de auditoria corretamente identificado; novos cliques bloqueados | Histórico de auditoria presente; rota agora inativa |

## Evidências técnicas

- Os links Actionpay ficam em um registro exclusivo do servidor e são devolvidos sem reescrita de caminho, query string ou fragmento.
- Cada clique ativo gera `partner_clicked` e `affiliate_click` antes do redirecionamento.
- O payload persistido contém `partner_id`, `partner_name`, `partner_campaign`, `affiliate_network`, `destination_url` e `traffic_campaign`.
- Nos testes, todos os eventos ativos foram persistidos e tiveram entrega GA4 auditada com HTTP 204.
- O payload de rede do GA4 foi validado com `partner_id`, `partner_name`, `partner_campaign` e `affiliate_network` corretos.
- Foi removida a colisão com o parâmetro reservado `session_id` do GA4. A sessão interna agora usa `zafi_session_id`, preservando a sessão numérica gerada pelo Google.
- O Cockpit leu os cliques diretamente da fonte oficial no Supabase e exibiu os parceiros pelos respectivos IDs e nomes.

## Pendências deliberadas

- O modelo CPC, CPL, CPA, comissão e regras de conversão permanece sem configuração.
- Nenhum postback definitivo foi criado.
- O nome oficial da campanha Acordo Certo permanece pendente porque a vitrine pública mostra mais de uma campanha possível para o parceiro e a referência privada não permite correspondência segura.
- Bom Pra Crédito depende do link oficial correto da Actionpay.
- ConsigMais depende da normalização da página do anunciante ou de um novo destino oficial.

