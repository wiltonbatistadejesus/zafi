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

Na primeira correção, a fila substituta usava um array criado por parâmetros rest. O runtime do Google carregava, mas não processava essa fila como o snippet oficial. A fila foi ajustada para preservar o objeto `arguments`. Depois dessa alteração, o GA4 passou a gerar `client_id`, sessão e requisições de coleta válidas.

## Correção aplicada

- O ID oficial foi configurado em Production, Preview e Development na Vercel.
- O ambiente local de desenvolvimento utiliza o mesmo ID público.
- Cada evento informa explicitamente `send_to: G-ZY4276HJZT`.
- O modo de depuração somente é ativado com `zafi_ga_debug=1`.
- A inicialização de `dataLayer` e `window.gtag` ocorre no ciclo React imediatamente após o consentimento, sem depender de um script inline inserido dinamicamente.
- A fila de comandos usa o formato oficial compatível com `gtag.js`, preservando o objeto `arguments` esperado pelo runtime do Google.
- O consentimento é declarado explicitamente: armazenamento analítico concedido após a escolha do usuário e armazenamento/publicidade negados.
- O carregamento da biblioteca é confirmado antes do envio dos eventos.
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

Após a ativação do cron, a auditoria acumulada registrou 104 execuções, 104 chaves de janela distintas e nenhuma falha. Os 109 snapshots existentes também possuem 109 chaves distintas. A diferença de cinco registros corresponde aos snapshots anteriores à automação, e não a duplicações.

## Validação em produção

Em 18 de julho de 2026, horário de Brasília, foi executado um teste controlado em navegador isolado, com consentimento analítico concedido.

Evidências técnicas confirmadas:

- `page_view` persistido no banco da Zafi;
- `analysis_started` persistido no banco da Zafi;
- `client_id` válido, sem armazenamento ou divulgação do valor;
- sessão GA4 válida, sem armazenamento ou divulgação do valor;
- requisições POST reais para `google-analytics.com/g/collect`;
- destino `G-ZY4276HJZT` em todas as requisições;
- respostas HTTP 204 observadas diretamente na rede;
- fluxo oficial exibindo “Dados em transferência” e coleta ativa nas últimas 48 horas.
- único filtro de dados existente, `Internal Traffic`, em estado de teste e não ativo; portanto, sem exclusão permanente dos eventos enviados.

O Google Analytics, entretanto, ainda exibiu zero eventos no Realtime e zero dispositivos no DebugView durante a janela observada. Nenhuma confirmação visual foi inserida artificialmente em `ga4_processing_confirmations`.

Por esse motivo, o estado correto do Google no CEO Cockpit permanece **Atenção**. A alteração para **Integrado** somente ocorrerá depois que o mesmo evento estiver visível no Realtime e no DebugView e essas duas evidências forem registradas.

Essa decisão segue a governança da OE-005.1: resposta HTTP 204 comprova recebimento técnico do endpoint, mas não substitui evidência de processamento na interface do GA4.

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

A Zafi passa a distinguir envio técnico de processamento confirmado e mantém snapshots operacionais contínuos sem depender de acesso humano ao painel. A parte de snapshots está aprovada tecnicamente; a confirmação visual do GA4 continua pendente de processamento externo e o Cockpit reflete isso sem falso positivo.
