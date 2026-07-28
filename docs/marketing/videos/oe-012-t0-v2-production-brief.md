# OE-012 — T0 v2 — Brief de Produção Profissional

## Estado

`blocked_provider_setup`

A versão T0 anterior é uma prova técnica e não está autorizada para publicação.

## Objetivo

Produzir um vídeo vertical profissional, de 30 a 40 segundos, sobre “Por que sobra mês no fim do salário?”, com avatar humano hiper-realista, voz pt-BR natural, edição de alta retenção e apresentação da interface real da Zafi.

## Roteiro final

**Gancho**

“Você recebe salário todo mês… então por que o dinheiro acaba antes do mês terminar?”

**Problema**

“Muitas vezes, não é só porque você ganha pouco. É porque ninguém ensinou você a enxergar para onde o dinheiro está indo.”

**Solução**

“A Zafi ajuda você a organizar sua situação financeira de forma simples, entender prioridades e tomar decisões melhores.”

**CTA**

“Quer entender melhor sua vida financeira? Faça o diagnóstico gratuito da Zafi.”

## Storyboard

| Tempo | Imagem | Movimento |
|---|---|---|
| 0–2s | Avatar em close e contato visual | Entrada rápida e zoom sutil |
| 2–5s | Avatar + texto “o dinheiro acaba antes?” | Palavra-chave destacada |
| 5–8s | B-roll de notificação de salário | Push-in |
| 8–11s | Calendário avançando | Cortes rítmicos |
| 11–14s | Avatar em plano médio | Microexpressão de identificação |
| 14–17s | B-roll de pequenos gastos | Contadores animados |
| 17–20s | Lista de despesas se acumulando | Motion graphics |
| 20–23s | Interface real da Zafi | Zoom guiado para o diagnóstico |
| 23–26s | Interface real com orientação | Destaque visual de prioridades |
| 26–29s | Avatar retomando a mensagem | Contato visual e pausa |
| 29–32s | Logo e CTA | Botão animado |
| 32–35s | meuzafi.com.br | Encerramento com trilha |

## Direção do avatar

- Pessoa brasileira adulta, aparência confiável, próxima e contemporânea.
- Avatar sintético licenciado; não imitar ou clonar pessoa real.
- Contato visual contínuo, microexpressões naturais e gestos discretos.
- Voz feminina ou masculina pt-BR, calorosa, conversacional e sem aparência de locução robótica.
- Ritmo confiante, com pausas curtas após o gancho e antes do CTA.

## Direção de edição

- Formato 9:16 em 1080×1920.
- Nenhuma cena superior a três segundos.
- Legendas palavra por palavra, sincronizadas com a fala.
- Destaque em azul Zafi e ciano para palavras-chave.
- Trilha instrumental moderna, sem voz, abaixo da narração.
- Narração em aproximadamente -16 LUFS; trilha pelo menos 10 dB abaixo.
- Usar somente interface real da Zafi e mídia própria, licenciada ou gerada.

## Gate obrigatório

- Avatar humano revisado.
- Naturalidade da voz igual ou superior a 90/100.
- Pelo menos três B-rolls, dois motion graphics e dois zooms dinâmicos.
- Interface real da Zafi visível.
- Legendas sincronizadas e acessíveis.
- Trilha presente sem competir com a voz.
- Nota geral mínima de 90/100.
- Aprovação explícita do CEO.

## Provedor inicial

Adaptador selecionado: `heygen-avatar-v2`.

Configurações necessárias no cofre da Vercel:

- `HEYGEN_API_KEY`
- `HEYGEN_AVATAR_ID`
- `HEYGEN_VOICE_ID`

As credenciais são exclusivamente de servidor e nunca podem utilizar o prefixo `NEXT_PUBLIC_`.
