# OE-015 — Diagnóstico Arquitetural da Content Factory

**Versão:** 1.0  
**Status:** Diagnóstico concluído; produção premium bloqueada por insumo humano ou credenciais premium  
**Data:** 28/07/2026

## Resumo executivo

A OE-014 não falhou por prompt. Ela falhou porque a pipeline produziu uma apresentação animada, não um vídeo humano profissional.

Os requisitos de avatar natural, voz humana e edição premium não foram efetivamente atendidos. A entrega anterior está reprovada como referência de produção.

## 1. Ferramentas utilizadas

| Etapa | Ferramenta utilizada na OE-014 | Resultado real |
|---|---|---|
| Apresentadora | Imagem estática gerada por IA | Não havia avatar em movimento, contato visual vivo ou sincronização labial |
| B-roll | Imagem estática gerada por IA e captura da interface Zafi | Não havia filmagem real nem ação contínua |
| Voz | Microsoft SAPI, voz Maria, 22,05 kHz | Voz sintética e acelerada em 1,35x |
| Layout | Sharp e SVG | Quadros estáticos com textos incorporados |
| Edição | FFmpeg | Oito cenas de 2,75 segundos com pequeno movimento de câmera |
| Legendas | Textos por cena | Não eram legendas palavra por palavra sincronizadas |
| Música | Tons sintetizados pelo FFmpeg | Não era uma trilha musical produzida ou licenciada |
| Interface | Captura real do meuzafi.com.br | Este requisito foi atendido |

## 2. Componente que mais limitou a qualidade

O maior limitador foi o material de origem. Uma fotografia estática não consegue entregar microexpressões, contato visual, gestos, sincronização labial ou presença humana.

O segundo limitador foi a voz SAPI. A aceleração reduziu ainda mais a naturalidade.

O FFmpeg não é, isoladamente, o problema. Ele consegue montar uma edição profissional quando recebe filmagens, áudio e marcações de tempo profissionais. Na OE-014, ele recebeu imagens estáticas e áudio limitado.

## 3. Limitação do avatar

Sim. O “avatar” da OE-014 era apenas uma imagem estática. Tecnicamente, não existia avatar de vídeo.

Substituição recomendada:

1. apresentador humano real, como padrão para a nova prova de qualidade;
2. HeyGen Avatar IV somente como alternativa, condicionado a teste cego;
3. nenhum avatar gerado por foto poderá ser publicado apenas porque o fornecedor o classifica como realista.

## 4. Limitação da voz

Sim. A voz usada era Microsoft SAPI em 22,05 kHz e foi acelerada em 1,35x. Ela não oferece o controle emocional, a prosódia e a naturalidade exigidos.

Substituição recomendada:

1. voz real gravada junto com o apresentador;
2. ElevenLabs Multilingual v2 com áudio de pelo menos 44,1 kHz e timestamps, quando uma voz sintética for necessária;
3. revisão humana obrigatória em português brasileiro.

## 5. Limitação da edição

Sim. A montagem era composta por imagens estáticas, textos por cena e um pequeno movimento de câmera. Não havia:

- performance humana contínua;
- B-roll em vídeo;
- legendas palavra por palavra;
- cortes orientados pela fala;
- motion graphics ligados ao conteúdo;
- trilha licenciada;
- desenho de som.

## 6. Ferramentas melhores disponíveis

### Arquitetura recomendada

| Componente | Solução principal | Alternativa |
|---|---|---|
| Apresentador | Humano real | HeyGen Avatar IV após teste cego |
| Voz | Voz captada em câmera | ElevenLabs Multilingual v2 |
| B-roll | Filmagem real licenciada e captura real da Zafi | Runway Gen-4.5 apenas para transições sem pessoas |
| Legendas | Timestamps por palavra | Revisão manual após geração |
| Edição | Timeline programática com clipes reais | Descript ou editor profissional |
| QA | Teste cego com cinco pessoas e decisão do CEO | Não existe aprovação automática substituta |

## 7. Custos

Valores consultados nas páginas oficiais em 28/07/2026:

| Ferramenta | Custo de referência |
|---|---|
| HeyGen Creator | US$ 29 por mês; 1080p, sem marca d’água e cinco minutos de Avatar IV |
| HeyGen API Avatar IV | aproximadamente US$ 0,05 a US$ 0,0667 por segundo, conforme tipo e resolução |
| ElevenLabs Starter | US$ 6 por mês, aproximadamente 30 minutos incluídos |
| ElevenLabs Creator | US$ 22 por mês, aproximadamente 121 minutos incluídos |
| Runway Standard | US$ 15 por mês, ou US$ 12 por mês no plano anual; 625 créditos |
| Runway Pro | US$ 35 por mês, ou US$ 28 por mês no plano anual; 2.250 créditos |
| Descript Creator | US$ 15 por mês, ou US$ 12 por mês no plano anual |
| Descript Pro | US$ 30 por mês, ou US$ 24 por mês no plano anual |

O custo mínimo mensal da alternativa totalmente sintética recomendada começa em aproximadamente US$ 50 por mês com HeyGen Creator, ElevenLabs Starter e Runway Standard.

## 8. Vale a pena substituir?

Sim.

- Microsoft SAPI deve ser removido da produção.
- Imagens estáticas não podem mais representar um avatar.
- Cenas formadas apenas por fotografias ficam proibidas no vídeo principal.
- A aprovação deixa de depender de campos declarados no sistema e passa a depender do arquivo final.
- A nova prova usará o mesmo tema, roteiro e conceito da campanha anterior.

## Nova regra técnica de aprovação

O arquivo somente poderá ser aprovado quando:

1. possuir apresentador real ou digital twin aprovado em teste cego;
2. nenhuma cena principal for apenas uma fotografia;
3. a voz for humana ou aprovada em teste de naturalidade em português brasileiro;
4. as legendas estiverem sincronizadas por palavra;
5. a interface real da Zafi aparecer;
6. pelo menos cinco pessoas participarem do teste cego;
7. no máximo uma pessoa identificar o vídeo como produzido por IA;
8. o CEO aprovar o arquivo final.

## Bloqueio atual

Não existem credenciais configuradas para HeyGen, ElevenLabs, Runway ou Captions.

Para produzir a próxima versão sem repetir a arquitetura reprovada, é necessário um destes insumos:

- vídeo bruto de um apresentador humano lendo o mesmo roteiro; ou
- conta HeyGen Creator/API e credenciais de Avatar IV, seguida de teste cego.

Até que um desses insumos exista, nenhum requisito visual será marcado como concluído.
