export type SeoArticle = {
  slug: string
  title: string
  description: string
  intro: string
  category: 'Primeiros passos' | 'Tipos de dívida' | 'Renegociação' | 'Bancos'
  steps: readonly (readonly [string, string])[]
  source?: { label: string; url: string }
}

export const seoArticles: readonly SeoArticle[] = [
  {
    slug: 'como-limpar-o-nome', category: 'Primeiros passos',
    title: 'Como limpar o nome: um passo a passo para negociar dívidas',
    description: 'Entenda como organizar pendências, falar com credores e escolher um acordo que cabe no seu orçamento.',
    intro: 'Ter o nome negativado pode limitar escolhas, mas não define o seu futuro financeiro. O primeiro passo é transformar a preocupação em informação e plano.',
    steps: [['Liste as pendências', 'Anote credor, valor, vencimento e tipo de dívida.'], ['Calcule quanto cabe no mês', 'Preserve despesas essenciais antes de assumir parcelas.'], ['Negocie com o credor', 'Peça entrada, prazo, juros e custo total por escrito.'], ['Acompanhe a regularização', 'Guarde comprovantes e confirme a baixa após cumprir o acordo.']],
  },
  {
    slug: 'o-que-fazer-quando-estou-endividado', category: 'Primeiros passos',
    title: 'Estou endividado: o que fazer agora?',
    description: 'Um plano prático para sair do modo de urgência, organizar dívidas e decidir com mais segurança.',
    intro: 'Quando as contas acumulam, o objetivo não é resolver tudo em um dia. É ganhar clareza, impedir que a situação piore e avançar uma decisão de cada vez.',
    steps: [['Proteja o essencial', 'Moradia, alimentação, saúde e transporte vêm antes de acordos.'], ['Faça um diagnóstico', 'Some as dívidas e identifique as que cobram juros maiores.'], ['Defina uma ordem', 'Priorize o que cresce mais rápido ou ameaça serviços essenciais.'], ['Avance sem pressão', 'Leia propostas e aceite somente parcelas sustentáveis.']],
  },
  {
    slug: 'como-organizar-dividas', category: 'Primeiros passos',
    title: 'Como organizar dívidas e criar uma ordem de pagamento',
    description: 'Monte uma visão completa das dívidas e defina prioridades sem comprometer despesas essenciais.',
    intro: 'Organizar não significa pagar tudo imediatamente. Significa saber o que existe, quanto custa e qual decisão vem primeiro.',
    steps: [['Reúna contratos e faturas', 'Registre saldo, taxa, parcela, atraso e credor.'], ['Separe essenciais e dívidas', 'Descubra o valor realmente disponível depois do básico.'], ['Ordene pelo impacto', 'Considere juros, risco de corte e consequências do atraso.'], ['Revise todo mês', 'Atualize saldos e ajuste o plano quando a renda mudar.']],
  },
  {
    slug: 'nome-negativado-o-que-fazer', category: 'Primeiros passos',
    title: 'Nome negativado: o que fazer e como começar',
    description: 'Saiba como conferir a pendência, evitar golpes e preparar uma negociação possível.',
    intro: 'A negativação é um sinal para investigar a dívida e planejar o próximo passo. Decidir com informação é mais importante do que agir com pressa.',
    steps: [['Confirme a origem', 'Verifique credor, contrato e valor antes de pagar.'], ['Desconfie de urgência', 'Não envie dados nem dinheiro por contatos não confirmados.'], ['Prepare uma proposta', 'Defina entrada e parcela compatíveis com o orçamento.'], ['Use canais oficiais', 'Finalize e guarde documentos somente em ambientes confiáveis.']],
  },
  {
    slug: 'divida-cartao', category: 'Tipos de dívida',
    title: 'Dívida de cartão de crédito: como sair do rotativo',
    description: 'Veja como organizar uma dívida de cartão e por que renegociar costuma vir antes de contratar novo crédito.',
    intro: 'O rotativo pode fazer a dívida crescer rapidamente. Agir cedo ajuda a transformar um saldo imprevisível em um plano possível.',
    steps: [['Interrompa novas compras', 'Evite misturar consumo novo com o saldo em negociação.'], ['Peça o saldo atualizado', 'Entenda principal, juros e opções do emissor.'], ['Compare propostas', 'Avalie parcela, prazo, CET e valor total.'], ['Só troque a dívida se reduzir custo', 'Crédito novo precisa ser comprovadamente mais barato.']],
  },
  {
    slug: 'divida-cheque-especial', category: 'Tipos de dívida',
    title: 'Dívida no cheque especial: como organizar e negociar',
    description: 'Entenda como sair do limite negativo e avaliar uma proposta de renegociação.',
    intro: 'O cheque especial mistura dívida e saldo da conta, o que pode esconder o tamanho real do problema. Separe os valores antes de negociar.',
    steps: [['Identifique o saldo usado', 'Confira quanto do limite está ocupado e os encargos.'], ['Pare de depender do limite', 'Ajuste pagamentos para não renovar a dívida todo mês.'], ['Consulte uma renegociação', 'Peça prazo, taxa, CET e custo total.'], ['Proteja o fluxo da conta', 'Planeje os débitos automáticos durante o acordo.']],
  },
  {
    slug: 'divida-emprestimo-pessoal', category: 'Tipos de dívida',
    title: 'Dívida de empréstimo pessoal: como renegociar',
    description: 'Organize parcelas atrasadas e compare novas condições de pagamento com segurança.',
    intro: 'Renegociar um empréstimo pode aliviar o mês, mas alongar demais o prazo também pode aumentar o custo final.',
    steps: [['Confira o contrato', 'Veja saldo, taxa, parcelas e encargos de atraso.'], ['Calcule uma parcela realista', 'Use a renda líquida depois das despesas essenciais.'], ['Compare prazo e custo', 'Parcela menor não significa acordo mais barato.'], ['Formalize e acompanhe', 'Guarde a proposta, o contrato e os comprovantes.']],
  },
  {
    slug: 'como-negociar-divida', category: 'Renegociação',
    title: 'Como negociar uma dívida: roteiro para conversar com o credor',
    description: 'Prepare seus números, compare condições e conduza uma negociação sem pressão.',
    intro: 'Uma negociação melhor começa antes do contato com o credor: você precisa conhecer seu limite e as condições que consegue cumprir.',
    steps: [['Defina seu teto', 'Escolha entrada e parcela máximas antes da conversa.'], ['Peça detalhes completos', 'Solicite saldo, desconto, juros, prazo e custo final.'], ['Faça contraproposta', 'Explique o valor que consegue manter com regularidade.'], ['Confirme por escrito', 'Leia tudo antes de pagar ou aceitar o acordo.']],
  },
  {
    slug: 'acordo-de-divida-cuidados', category: 'Renegociação',
    title: 'Acordo de dívida: cuidados antes de aceitar',
    description: 'Veja o que conferir em uma proposta de acordo para evitar uma parcela inviável ou um custo maior.',
    intro: 'O melhor acordo não é necessariamente o maior desconto. É aquele que reduz o problema e pode ser cumprido até o final.',
    steps: [['Confirme quem está cobrando', 'Valide credor e canal antes de fornecer dados.'], ['Leia as condições', 'Confira entrada, datas, juros, multas e valor total.'], ['Teste a parcela no orçamento', 'Inclua uma margem para despesas inesperadas.'], ['Guarde os documentos', 'Mantenha proposta, contrato e comprovantes organizados.']],
  },
  {
    slug: 'parcela-da-divida-nao-cabe', category: 'Renegociação',
    title: 'A parcela da dívida não cabe no orçamento: o que fazer?',
    description: 'Saiba como recalcular sua capacidade de pagamento e pedir uma condição mais sustentável.',
    intro: 'Aceitar uma parcela impossível costuma apenas adiar o problema. Refaça os números e negocie com base no valor que realmente sobra.',
    steps: [['Refaça o orçamento', 'Separe despesas essenciais, variáveis e compromissos.'], ['Encontre o valor disponível', 'Use uma média conservadora, não o melhor mês.'], ['Peça outra condição', 'Compare entrada menor, prazo e custo total.'], ['Não complete com outra dívida', 'Evite crédito novo apenas para sustentar parcelas.']],
  },
  {
    slug: 'renegociar-divida-itau', category: 'Bancos',
    title: 'Como renegociar dívida com o Itaú com segurança',
    description: 'Veja como organizar sua proposta e acessar os canais oficiais do Itaú para renegociar uma dívida.',
    intro: 'Antes de aceitar um acordo, entenda o saldo, defina quanto cabe no mês e use somente os canais oficiais do banco.',
    source: { label: 'Canal oficial de renegociação do Itaú', url: 'https://www.itau.com.br/renegociacao' },
    steps: [['Separe os dados da dívida', 'Tenha contrato, saldo atualizado e parcelas em atraso.'], ['Defina seu limite mensal', 'Proteja despesas essenciais e mantenha uma margem.'], ['Consulte o canal oficial', 'Confira as propostas diretamente no ambiente do banco.'], ['Compare o custo total', 'Verifique entrada, prazo, juros, CET e valor final.']],
  },
  {
    slug: 'renegociar-divida-santander', category: 'Bancos',
    title: 'Como renegociar dívida com o Santander com segurança',
    description: 'Organize sua negociação e consulte propostas pelos canais oficiais do Santander.',
    intro: 'Uma boa renegociação reduz a pressão do mês sem criar uma parcela impossível. Prepare seu orçamento antes de consultar ofertas.',
    source: { label: 'Portal oficial de renegociação do Santander', url: 'https://www.santander.com.br/renegocie/home?ic=homepf-menu-renegociacao' },
    steps: [['Confirme o valor atualizado', 'Consulte contratos e parcelas em aberto.'], ['Calcule uma parcela possível', 'Considere renda, essenciais e imprevistos.'], ['Entre pelo portal oficial', 'Informe dados somente no domínio do banco.'], ['Leia todas as condições', 'Compare entrada, parcelas, custo e vencimentos.']],
  },
]

export const seoArticleMap = Object.fromEntries(seoArticles.map((article) => [article.slug, article])) as Record<string, SeoArticle>
