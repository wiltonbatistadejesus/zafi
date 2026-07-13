export const SITE_URL = 'https://meuzafi.com.br'

export const categories = [
  { slug: 'bancos', name: 'Bancos', icon: '🏦', description: 'Canais oficiais e negociação com cada instituição.' },
  { slug: 'cartoes', name: 'Cartões', icon: '💳', description: 'Fatura, rotativo, parcelamento e acordos.' },
  { slug: 'renegociacao', name: 'Renegociação', icon: '🤝', description: 'Acordos, negativação e retomada do controle.' },
  { slug: 'score', name: 'Score', icon: '📈', description: 'Pontuação, cadastro e histórico de crédito.' },
  { slug: 'emprestimos', name: 'Empréstimos', icon: '💰', description: 'Custos, riscos e decisões antes de contratar.' },
  { slug: 'educacao-financeira', name: 'Educação Financeira', icon: '🧭', description: 'Conceitos para decidir com mais clareza.' },
] as const
export type CategorySlug = typeof categories[number]['slug']

type Source = { title: string; publisher: string; url: string }
export type Entry = {
  slug: string; category: CategorySlug; title: string; description: string; answer: string
  reviewedAt: string; sections: readonly { title: string; text: string; items?: readonly string[] }[]
  faqs: readonly { question: string; answer: string }[]; sources: readonly Source[]; related: readonly string[]
}

const bcbLoans: Source = { title: 'Tipos de empréstimo e financiamento', publisher: 'Banco Central do Brasil', url: 'https://www.bcb.gov.br/cidadaniafinanceira/tiposemprestimo/' }
const bcbRegisters: Source = { title: 'Diferença entre cadastro positivo e negativo', publisher: 'Banco Central do Brasil', url: 'https://bcb.gov.br/meubc/faqs/p/diferenca-entre-o-cadastro-positivo-e-o-cadastro-negativo' }
const serasaScore: Source = { title: 'Como aumentar meu Score?', publisher: 'Serasa', url: 'https://www.serasa.com.br/ajuda/serasa-score/como-aumentar-meu-score/' }

export const entries: readonly Entry[] = [
  {
    slug: 'como-negociar-divida-nubank', category: 'bancos', title: 'Como negociar dívida com o Nubank',
    description: 'Consulte a dívida, avalie a proposta e negocie pelos canais oficiais com segurança.',
    answer: 'Consulte a dívida no aplicativo do Nubank ou em um canal oficial indicado pela instituição. Antes de aceitar, compare entrada, parcelas, juros e valor total com o que realmente cabe no orçamento.',
    reviewedAt: '2026-07-12',
    sections: [
      { title: 'Prepare seu limite', text: 'Separe o saldo atualizado e calcule quanto sobra depois de moradia, alimentação, saúde e transporte.', items: ['Defina entrada e parcela máximas.', 'Mantenha margem para imprevistos.', 'Não comprometa despesas essenciais.'] },
      { title: 'Consulte os canais oficiais', text: 'O Nubank informa que as opções podem aparecer no aplicativo e em canais parceiros apresentados pela própria instituição. Confirme domínio e beneficiário antes de pagar.' },
      { title: 'Compare a proposta completa', text: 'Confira desconto, quantidade de parcelas, juros, vencimentos e custo final. Guarde as condições e os comprovantes.' },
    ],
    faqs: [{ question: 'Dá para negociar pelo aplicativo?', answer: 'Sim. O Nubank orienta consultar no aplicativo as opções disponíveis para cada situação.' }, { question: 'Vale pegar outro empréstimo para pagar?', answer: 'Somente se o novo crédito tiver CET menor e a parcela for sustentável.' }],
    sources: [{ title: 'Como negociar dívida no Nubank', publisher: 'Nubank', url: 'https://blog.nubank.com.br/como-negociar-divida-no-nubank/' }, bcbLoans], related: ['como-negociar-cartao-de-credito', 'como-limpar-o-nome'],
  },
  {
    slug: 'como-negociar-divida-santander', category: 'bancos', title: 'Como negociar dívida com o Santander',
    description: 'Organize sua proposta e consulte uma renegociação do Santander em canais oficiais.',
    answer: 'Acesse o portal oficial de renegociação do Santander, confira os contratos e compare as condições. Aceite apenas uma parcela que continue possível nos meses mais apertados.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Defina uma parcela realista', text: 'Calcule o valor livre depois das despesas essenciais e reserve margem para imprevistos.' }, { title: 'Use o portal oficial', text: 'Entre diretamente no domínio do Santander. Evite links desconhecidos e nunca faça depósito antecipado para liberar proposta.' }, { title: 'Revise antes de aceitar', text: 'Confira entrada, prazo, juros, custo total e regras em caso de atraso.' }],
    faqs: [{ question: 'A proposta é igual para todos?', answer: 'Não. As condições variam conforme contrato, atraso e ofertas disponíveis.' }, { question: 'A menor parcela é sempre melhor?', answer: 'Não. Prazo maior pode elevar o custo total.' }],
    sources: [{ title: 'Portal de renegociação', publisher: 'Santander', url: 'https://www.santander.com.br/renegocie/home?ic=homepf-menu-renegociacao' }], related: ['como-negociar-divida-itau', 'como-limpar-o-nome'],
  },
  {
    slug: 'como-negociar-divida-itau', category: 'bancos', title: 'Como negociar dívida com o Itaú',
    description: 'Prepare e consulte uma renegociação de dívida do Itaú com segurança.',
    answer: 'Consulte o canal oficial de renegociação do Itaú, identifique os contratos disponíveis e analise cada condição. Compare o custo total antes de assumir o acordo.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Faça um diagnóstico curto', text: 'Anote saldo, atrasos e encargos. Defina entrada e parcela com base na renda líquida.' }, { title: 'Consulte diretamente o Itaú', text: 'Use o portal oficial e confirme as informações antes do primeiro pagamento.' }, { title: 'Olhe além do desconto', text: 'Compare prazo, juros e custo final. Não complete a parcela com outra dívida.' }],
    faqs: [{ question: 'Posso negociar mais de um contrato?', answer: 'As opções dependem dos contratos elegíveis mostrados pelo banco.' }, { question: 'O nome é regularizado na hora?', answer: 'A atualização depende das condições do acordo e do processamento dos cadastros.' }],
    sources: [{ title: 'Renegociação de dívidas', publisher: 'Itaú', url: 'https://www.itau.com.br/renegociacao' }], related: ['como-negociar-divida-santander', 'como-limpar-o-nome'],
  },
  {
    slug: 'como-limpar-o-nome', category: 'renegociacao', title: 'Como limpar o nome',
    description: 'Confirme as pendências, negocie com segurança e acompanhe a regularização.',
    answer: 'Primeiro confirme quais pendências são legítimas. Depois negocie com o credor ou em canal reconhecido, aceite uma condição sustentável e acompanhe a retirada da negativação conforme o acordo.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Confirme antes de pagar', text: 'Identifique credor, contrato, valor e origem. Conteste o que não reconhecer.', items: ['Não pague sob pressão.', 'Confira o beneficiário.', 'Use canais oficiais.'] }, { title: 'Monte uma proposta possível', text: 'Compare o desconto à vista com o custo parcelado e preserve as despesas essenciais.' }, { title: 'Acompanhe a regularização', text: 'Guarde proposta e comprovantes e verifique a atualização da pendência.' }],
    faqs: [{ question: 'Pagar aumenta o score na hora?', answer: 'Não há garantia de aumento imediato. A pontuação considera diferentes informações.' }, { question: 'Preciso pagar alguém para limpar meu nome?', answer: 'Não. Desconfie de promessas de remoção instantânea ou score garantido.' }],
    sources: [bcbRegisters, serasaScore], related: ['como-aumentar-o-score', 'divida-prescreve-o-que-acontece'],
  },
  {
    slug: 'como-aumentar-o-score', category: 'score', title: 'Como aumentar o Score',
    description: 'Veja o que pode ajudar a pontuação e por que não existe aumento garantido.',
    answer: 'Não há fórmula instantânea. Pagar em dia, regularizar dívidas, evitar muitas solicitações de crédito seguidas e manter os dados atualizados pode contribuir para um histórico mais consistente.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Hábitos que podem ajudar', text: 'O score considera um conjunto de informações e não uma ação isolada.', items: ['Pague compromissos no vencimento.', 'Negocie pendências sustentáveis.', 'Evite pedidos de crédito em sequência.', 'Mantenha os dados atualizados.'] }, { title: 'Cuidado com promessas', text: 'Ninguém pode garantir uma pontuação específica nem vender aumento imediato.' }, { title: 'Score não é aprovação', text: 'Cada empresa usa critérios próprios para conceder crédito.' }],
    faqs: [{ question: 'Existe pagamento para aumentar o score?', answer: 'Não. A Serasa alerta contra serviços que garantem aumento mediante pagamento.' }, { question: 'Quanto tempo demora?', answer: 'Não existe prazo fixo; a pontuação é dinâmica.' }],
    sources: [serasaScore, { title: 'Posso confiar em quem promete aumentar o score?', publisher: 'Serasa', url: 'https://www.serasa.com.br/ajuda/serasa-score/posso-confiar-em-empresas-que-prometem-aumentar-o-score/' }], related: ['como-limpar-o-nome', 'diferenca-entre-serasa-e-spc'],
  },
  {
    slug: 'divida-prescreve-o-que-acontece', category: 'renegociacao', title: 'O que acontece quando uma dívida prescreve?',
    description: 'Entenda o que a prescrição muda e por que não significa perdão automático.',
    answer: 'A prescrição pode limitar a cobrança judicial depois do prazo aplicável, mas não equivale automaticamente ao apagamento da dívida. Prazo e efeitos dependem do tipo de obrigação e dos fatos do caso.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Prescrição não é perdão', text: 'Ela está ligada à possibilidade de exigir judicialmente uma obrigação após determinado prazo.' }, { title: 'O prazo pode variar', text: 'O Código Civil prevê prazos diferentes. Renegociação, reconhecimento e processos anteriores podem alterar a análise.' }, { title: 'Como agir', text: 'Peça contrato e evolução do saldo. Para um caso concreto, procure orientação jurídica ou órgão de defesa do consumidor.' }],
    faqs: [{ question: 'Toda dívida prescreve em cinco anos?', answer: 'Não. Os prazos variam conforme o tipo de obrigação e as circunstâncias.' }, { question: 'A dívida deixa de existir?', answer: 'Prescrição e existência da obrigação são questões diferentes.' }],
    sources: [{ title: 'Código Civil — Lei nº 10.406/2002', publisher: 'Presidência da República', url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm' }], related: ['como-limpar-o-nome', 'como-funciona-acordo-certo'],
  },
  {
    slug: 'como-funciona-acordo-certo', category: 'renegociacao', title: 'Como funciona o Acordo Certo?',
    description: 'Entenda o papel da plataforma e os cuidados antes de aceitar uma oferta.',
    answer: 'O Acordo Certo conecta consumidores a ofertas de empresas participantes. A pessoa consulta propostas vinculadas ao CPF, analisa as condições e, se concordar, formaliza o acordo.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'O que a plataforma faz', text: 'Ela apresenta oportunidades disponibilizadas por credores participantes. Nem toda dívida estará disponível.' }, { title: 'Antes de fechar', text: 'Confirme credor, saldo, desconto, entrada, parcelas, valor total e beneficiário.' }, { title: 'Depois do acordo', text: 'Cumpra os vencimentos, acompanhe a dívida e guarde os comprovantes.' }],
    faqs: [{ question: 'Toda dívida aparece?', answer: 'Não. Depende das empresas participantes e das ofertas disponíveis.' }, { question: 'A Zafi é o Acordo Certo?', answer: 'Não. A Zafi oferece orientação independente e pode indicar parceiros quando fizer sentido.' }],
    sources: [{ title: 'Acordo Certo', publisher: 'Acordo Certo', url: 'https://www.acordocerto.com.br/' }], related: ['como-limpar-o-nome', 'como-negociar-cartao-de-credito'],
  },
  {
    slug: 'como-negociar-cartao-de-credito', category: 'cartoes', title: 'Como negociar cartão de crédito',
    description: 'Organize a fatura, compare alternativas e saia do rotativo de forma sustentável.',
    answer: 'Peça ao emissor o saldo e as opções de acordo. Compare CET, valor total e prazo; priorize sair do rotativo sem assumir parcela que dependa de novo crédito.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Separe consumo e dívida', text: 'Evite novas compras no cartão negociado para não misturar dívida antiga e gastos novos.' }, { title: 'Peça números completos', text: 'Solicite saldo, juros, encargos, parcelas e CET.' }, { title: 'Escolha uma saída sustentável', text: 'Crédito novo só ajuda quando reduz o custo e cabe no orçamento.' }],
    faqs: [{ question: 'Parcelar é sempre melhor que o rotativo?', answer: 'Compare CET e valor total de cada opção.' }, { question: 'Devo usar outro cartão?', answer: 'Transferir gastos sem reduzir o custo costuma apenas adiar o problema.' }],
    sources: [bcbLoans], related: ['emprestimo-para-negativado-vale-a-pena', 'como-negociar-divida-nubank'],
  },
  {
    slug: 'emprestimo-para-negativado-vale-a-pena', category: 'emprestimos', title: 'Empréstimo para negativado vale a pena?',
    description: 'Saiba quando o crédito pode reduzir o custo e quais sinais de risco observar.',
    answer: 'Pode fazer sentido apenas se substituir uma dívida mais cara, tiver CET menor e couber no orçamento. Nunca faça depósito antecipado e confirme se a instituição é autorizada.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'Quando pode ajudar', text: 'A troca só melhora a situação quando reduz o custo total e cria uma parcela sustentável.' }, { title: 'Quando piora', text: 'Prazo excessivo ou parcela sem folga pode prolongar o endividamento.' }, { title: 'Sinais de golpe', text: 'O Banco Central alerta contra depósito antecipado para liberar crédito.', items: ['Não pague taxa antecipada.', 'Não compartilhe senhas.', 'Compare propostas pelo CET.'] }],
    faqs: [{ question: 'Podem cobrar depósito para liberar?', answer: 'O Banco Central orienta que não se deve exigir depósito prévio para empréstimo.' }, { question: 'O que comparar?', answer: 'Use o CET, que reúne juros, tarifas, impostos e outros custos.' }],
    sources: [bcbLoans, { title: 'BC alerta sobre depósito prévio', publisher: 'Banco Central do Brasil', url: 'https://www.bcb.gov.br/detalhenoticia/15352/nota' }], related: ['como-negociar-cartao-de-credito', 'como-limpar-o-nome'],
  },
  {
    slug: 'diferenca-entre-serasa-e-spc', category: 'educacao-financeira', title: 'Diferença entre Serasa e SPC',
    description: 'Entenda o que têm em comum e por que uma informação pode aparecer só em uma base.',
    answer: 'Serasa e SPC são gestores de bancos de dados de crédito. Ambas podem registrar informações negativas, mas são organizações diferentes, com bases, serviços e participantes próprios.',
    reviewedAt: '2026-07-12',
    sections: [{ title: 'O que têm em comum', text: 'As duas atuam com informações usadas em análise de crédito. O Banco Central informa que não são reguladas por ele.' }, { title: 'Por que os resultados diferem', text: 'Credores e datas de atualização podem variar entre bases.' }, { title: 'Como verificar', text: 'Consulte os canais oficiais, confirme com o credor e conteste o que não reconhecer.' }],
    faqs: [{ question: 'São a mesma empresa?', answer: 'Não. São organizações diferentes.' }, { question: 'O Banco Central controla as duas?', answer: 'Segundo o Banco Central, SPC e Serasa não são regulados por ele.' }],
    sources: [bcbRegisters], related: ['como-aumentar-o-score', 'como-limpar-o-nome'],
  },
]

export const entryMap = Object.fromEntries(entries.map((entry) => [entry.slug, entry])) as Record<string, Entry>
export const categoryMap = Object.fromEntries(categories.map((category) => [category.slug, category])) as Record<CategorySlug, typeof categories[number]>
export const entryHref = (entry: Entry) => `/oraculo/${entry.category}/${entry.slug}`
export function relatedEntries(entry: Entry) {
  const selected = entry.related.map((slug) => entryMap[slug]).filter(Boolean)
  return [...selected, ...entries.filter((item) => item.slug !== entry.slug && !selected.includes(item))].slice(0, 3)
}
