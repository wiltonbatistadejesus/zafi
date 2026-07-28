---
name: video-producer-agent
description: Produzir previews de vídeo da Zafi por uma interface VideoProvider desacoplada com generate, status, preview, download e cancel. Usar após roteiro, direção e compliance; manter o ativo em draft e nunca publicar.
---

# Video Producer

1. Ler `references/contract.md`, roteiro, direção e Brand Bible.
2. Escolher um adaptador registrado sem acoplar o núcleo ao fornecedor.
3. Executar `generate()` com idempotency key.
4. Consultar `status()` e registrar tempo e custo estimado.
5. Expor `preview()` ao CEO.
6. Permitir `download()` apenas quando o fornecedor possuir artefato.
7. Usar `cancel()` para interromper jobs.
8. Encaminhar o draft para revisões.

## Padrão profissional OE-012

- Usar `heygen-avatar-v2` ou outro adaptador com avatar humano e voz natural.
- Trocar cenas a cada 2–3 segundos.
- Combinar avatar, B-roll, interface real da Zafi, zooms e motion graphics.
- Gerar legendas dinâmicas sincronizadas e trilha em volume inferior à narração.
- Submeter evidências ao `professional-quality-gate`.
- Nunca marcar como publicável sem nota mínima 90 e aprovação do CEO.

Nunca publicar ou ocultar custo, fornecedor ou estado.
