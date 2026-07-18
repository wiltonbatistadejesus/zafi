# OE-003A — Atlas Core

## Papel estratégico

O Atlas Core é a fonte oficial para parceiros, produtos, campanhas, remuneração, integrações, elegibilidade, posicionamento e desempenho. O código da aplicação não contém mais listas de parceiros, links afiliados, limites de elegibilidade ou pesos específicos por parceiro.

## Modelo

| Bloco | Tabela | Responsabilidade |
|---|---|---|
| Parceiro | `atlas_partners` | Identidade, vínculo futuro com o Oráculo, atividade e saúde operacional |
| Produto | `atlas_products` | Tipo, conteúdo de apresentação, pontuação base e estado |
| Campanha | `atlas_campaigns` | Rede, identificador externo e vigência |
| Produto–campanha | `atlas_product_campaigns` | Campanha principal ou alternativa por produto |
| Remuneração | `atlas_remuneration` | CPC, CPL, CPA, revenue share, fixo ou confirmação pendente |
| Integração | `atlas_integrations` | Redirect, postback, URL oficial e estratégia de conciliação do clique |
| Elegibilidade | `atlas_eligibility_rules` | Atributo, operador, valor, efeito, peso, explicação e vigência |
| Posicionamento | `atlas_placements` | Página, seção e ordem de exibição |
| Performance | `atlas_partner_performance` | Cliques, conversões, aprovações, receita, EPC e taxa, derivados dos eventos reais |

## Contrato do Recommendation Engine

O endpoint interno `/api/atlas/catalog` entrega produtos ativos com regras ordenadas. O avaliador genérico suporta regras obrigatórias, exclusões e pontuação. Atributos, operadores, valores e pesos vêm do banco.

Contexto aceito nesta versão:

- quantidade e tipos de dívidas;
- dívida total;
- renda mensal;
- relação dívida/renda.

Adicionar um parceiro, alterar um limite ou desativar um produto não exige mudança no código. A próxima sprint poderá acrescentar explicabilidade, experimentos e modelos sem migrar novamente o catálogo.

## Governança

- remuneração desconhecida permanece `pending_confirmation`, sem estimativa;
- métricas são calculadas a partir de `affiliate_clicks` e `affiliate_conversions`;
- parceiros desativados permanecem no histórico, mas não entram no catálogo consultado pela aplicação;
- URLs afiliadas ficam no servidor e nunca são enviadas pelo endpoint público do catálogo;
- todas as tabelas têm RLS e acesso direto revogado;
- o vínculo `knowledge_entity_id` está preparado para o Oráculo, mas permanece opcional até o schema de conhecimento existir em produção.

## Inventário inicial

Foram cadastrados Acordo Certo, SuperSim, FinanciaTudo, Juros Baixos, FinanZero e Bom Pra Crédito como ativos. ConsigMais foi preservado como inativo, mantendo seu histórico e a justificativa operacional.
