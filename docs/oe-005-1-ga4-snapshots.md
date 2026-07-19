# OE-005.1 — GA4 Oficial e Snapshots Automáticos

## Objetivo

Regularizar a integração do Google Analytics 4 da Zafi e remover o acesso humano ao CEO Cockpit como dependência para criação dos snapshots operacionais.

## Fluxo oficial confirmado

- Conta: Zafi.
- Propriedade: Zafi.
- Domínio: `https://meuzafi.com.br`.
- Nome do fluxo existente: `Zafi — Web`.
- Código do fluxo: `15261526070`.
- ID de medição: `G-ZY4276HJZT`.
- Estado observado: coleta ativa nas últimas 48 horas.

Nenhuma propriedade ou fluxo adicional foi criado.

## Desfazimento da tentativa anterior

A tentativa incompleta de criar o fluxo `Zafi — Produção` foi cancelada antes da confirmação final. O Google Analytics permaneceu com apenas o fluxo Web original.

## Causa encontrada no GA4

A auditoria anterior classificava o evento como aceito e registrava HTTP 204 quando o callback da tag `gtag` era executado.

Esse comportamento não comprovava uma resposta HTTP 204 observada. O callback informa que a tag processou a solicitação no navegador, mas não comprova que o GA4 indexou e exibiu o evento no Realtime ou no DebugView.

Além disso, os eventos comuns não recebiam `debug_mode`, razão pela qual não eram elegíveis para aparecer no DebugView durante um teste controlado.

O teste em produção também comprovou que o arquivo `gtag.js` do fluxo oficial era baixado, mas `window.gtag` não era inicializado. O bloco inline renderizado após a mudança dinâmica do consentimento permanecia no DOM sem executar. Dessa forma, a persistência da Zafi funcionava enquanto o envio ao Google não era iniciado.

## Correção aplicada

- O ID oficial foi configurado em Production, Preview e Development na Vercel.
- O ambiente local de desenvolvimento utiliza o mesmo ID público.
- Cada evento informa explicitamente `send_to: G-ZY4276HJZT`.
- O modo de depuração somente é ativado com `zafi_ga_debug=1`.
- A inicialização de `dataLayer` e `window.gtag` ocorre no ciclo React imediatamente após o consentimento, sem depender de um script inline inserido dinamicamente.
- O parâmetro interno de sessão permanece como `zafi_session_id`, sem colidir com o `session_id` numérico do GA4.
- A aplicação verifica a presença e o formato de `client_id` e da sessão GA4 sem persistir seus valores.
- O status técnico passou de `accepted` para `sent`.
- O callback não registra mais um código HTTP 204 fictício.
- Measurement Protocol API Secret não é enviado ao navegador, não aparece nos logs e não é registrado na documentação.

## Estados do Cockpit

### Integrado

Somente quando existem evidências recentes tanto no Realtime quanto no DebugView para o fluxo oficial.

### Atenção

O ID oficial está configurado e existem envios técnicos, mas a confirmação visual recente está incompleta.

### Não integrado

O ID está ausente ou diverge de `G-ZY4276HJZT`.

## Evidências de processamento

A tabela append-only `ga4_processing_confirmations` registra:

- evento original da Zafi;
- origem da evidência: Realtime ou DebugView;
- ID de medição;
- nome do evento;
- horário observado;
- versão do schema.

Uma confirmação somente é aceita quando o evento existe no banco e o nome observado corresponde ao evento persistido.

## Snapshots automáticos

O Supabase Cron executa `operational_monitor_run_scheduled` a cada cinco minutos.

O agendamento:

- independe da abertura do CEO Cockpit;
- cria no máximo um snapshot por bloco de cinco minutos;
- registra sucesso ou falha em `operational_monitor_runs`;
- preserva o snapshot como append-only;
- mantém código e detalhe de falha para auditoria;
- permite ao Cockpit somente consultar o snapshot mais recente.

O CEO Cockpit não persiste mais snapshots durante a leitura.

## Idempotência validada

Três chamadas do agendador no mesmo bloco produziram:

- um único registro de execução;
- um único snapshot para a chave da janela;
- nenhuma falha;
- nenhum registro duplicado.

## Segurança

- Tabelas de evidência e execução possuem RLS e negam acesso direto.
- Escritas são append-only.
- Funções públicas exigem o segredo interno do servidor.
- O agendador interno somente aceita execução pelo usuário PostgreSQL do scheduler.
- O ID `G-...` é público por natureza; nenhuma credencial secreta é incorporada ao bundle.

## Fora do escopo preservado

- Recommendation Engine.
- Atlas Core.
- Ranking.
- Pesos.
- Elegibilidade.
- Cadastro ou priorização de parceiros.

## Resultado operacional

A Zafi passa a distinguir envio técnico de processamento confirmado e mantém snapshots operacionais contínuos sem depender de acesso humano ao painel.
