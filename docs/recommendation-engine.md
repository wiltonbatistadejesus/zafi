# Recommendation Engine — OE-003B

## Contrato

O motor `rules-1.0.0` é determinístico. A entrada é sempre o Perfil Inteligente persistido e o catálogo, os estados operacionais, as regras e os pesos vigentes no Atlas Core. O navegador envia somente `visitorId`, `sessionId` e a rota da página.

## Fluxo

1. A sessão é validada contra a sessão atual registrada na raiz do Perfil Inteligente.
2. O contexto financeiro é lido de `profile_financial_context`; atributos calculados só entram quando existem em `profile_intelligence`.
3. Os produtos posicionados na rota são avaliados. Estados operacionais inválidos excluem a opção.
4. Cada regra ativa do Atlas é avaliada genericamente por atributo, operador e efeito (`require`, `exclude` ou `score`).
5. Produtos elegíveis são ordenados por pontuação e, em empate, pela ordem editorial do Atlas.
6. A execução e cada decisão são gravadas de forma append-only em `recommendation_runs` e `recommendation_decisions`.

## Auditoria e experimentos

Cada resultado contém `runId`, versão do motor, versão temporal do Atlas, snapshot dos dados usados, regras aplicadas, valores comparados e motivos de recomendação ou exclusão. A chave idempotente combina sessão, perfil, Atlas, rota e versão do motor. Os campos de experimento existem, mas permanecem nulos até haver um experimento real aprovado.

## Governança

- Não há IA generativa nem machine learning.
- Não há limites, pesos ou identificadores de parceiros no código da aplicação.
- Dados de identidade pessoal não são usados nem devolvidos pelo motor.
- A API não aceita contexto financeiro enviado pelo navegador.
- Nenhum resultado fictício é produzido quando o perfil está incompleto ou o motor está indisponível.
