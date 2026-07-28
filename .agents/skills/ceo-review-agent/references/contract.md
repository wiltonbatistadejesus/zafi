# Contrato

## Entrada

- pacote completo em `pending_approval`;
- quality score, compliance aprovado, custo e fornecedor.

## Saída

- decisão, observação, data e responsável;
- novo estado `approved`, `changes_requested` ou `rejected`;
- handoff separado para publicação manual.

Rejeitar pacote incompleto, compliance bloqueado ou tentativa de publicar pela aprovação.
