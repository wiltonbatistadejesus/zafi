# Contrato

## Entrada

- `asset_id`, roteiro, direção, formato e Brand Bible;
- provider, idempotency key e limite de custo.

## Saída

- `provider_job_id`, fornecedor e estado;
- preview, download quando disponível, duração e formato;
- tempo de geração, custo estimado e erros;
- status `production_draft`.

Rejeitar integração que exija regra específica no núcleo ou publique automaticamente.
