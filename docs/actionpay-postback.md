# Actionpay — ciclo financeiro da Zafi

## Endpoint

- Produção: `https://meuzafi.com.br/api/postbacks/actionpay`
- Métodos: `GET` e `POST`
- Resposta aceita: `200 OK`
- Autenticação principal: token secreto exclusivo da Zafi, configurado na Vercel.
- Autenticação alternativa preparada: HMAC-SHA256 do corpo bruto, caso a Actionpay disponibilize assinatura nativa.

O token e qualquer assinatura recebida são removidos do payload antes da auditoria. O corpo bruto não é gravado como texto: somente o payload sanitizado e seu hash SHA-256.

## Contrato aceito pela Zafi

| Dado | Parâmetros aceitos |
| --- | --- |
| Transação | `transaction_id`, `transaction`, `action_id`, `actionid`, `order_id`, `orderid`, `tid` |
| Clique Zafi | `click_id`, `clickid`, `subaccount`, `subid`, `subid1`, `subit1` |
| Campanha | `campaign_id`, `campaignid`, `offer_id`, `offerid`, `offer`, `apid` |
| Status | `status`, `event`, `action_status`, `actionstatus`, `state` |
| Comissão | `commission`, `payment`, `payout`, `sum`, `amount` |
| Moeda | `currency`, `currency_code`, `currencycode` |
| Data | `event_at`, `event_date`, `action_date`, `created_at`, `date`, `timestamp` |

Uma conversão aprovada sem comissão e moeda é rejeitada. Status desconhecido, transação ausente, clique inválido ou divergência entre clique e campanha também são rejeitados.

## Conciliação e idempotência

Cada saída pela rota `/go` cria um UUID de clique. Nos links `apretailer.com.br`, esse UUID ocupa o segmento `subaccount`. Quando o postback retorna, o banco recupera parceiro, campanha, sessão, visitante e página de origem a partir desse clique.

A chave idempotente considera rede, transação, status, comissão, moeda, clique e campanha. Uma repetição idêntica cria somente um registro de auditoria com resultado `duplicate`; não duplica conversão nem receita. Uma mudança legítima de status cria uma nova entrada imutável no histórico e atualiza a projeção financeira atual.

## Fonte oficial e Cockpit

- `affiliate_clicks`: cliques conciliáveis.
- `affiliate_conversions`: estado financeiro atual por transação.
- `affiliate_conversion_events`: histórico imutável de alterações.
- `affiliate_postback_audit`: recebimentos aceitos, duplicados e rejeitados.
- `telemetry_cockpit_snapshot`: entrega conversões, receita por período, parceiros e histórico ao CEO Cockpit.

O Cockpit considera receita apenas quando o estado atual é `approved`. Atualizações aparecem no próximo ciclo automático do painel, em até 10 segundos.

## Ativação na Actionpay

Os nomes das macros de transação, clique, campanha, status, comissão e moeda devem ser copiados da tela oficial de postback/metas da Actionpay. Não substituir por nomes presumidos. Depois de salvar a URL oficial, executar uma conversão real ou o teste oficial da rede e confirmar o mesmo `transaction_id` no histórico do Cockpit e na auditoria do banco.

