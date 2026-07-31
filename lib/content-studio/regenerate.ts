import type { StudioContent, StudioPage } from './types'

const OFFICIAL_CTA = 'Faça seu diagnóstico financeiro gratuito em meuzafi.com.br.'
const VARIANTS = ['ledger', 'split', 'grid', 'path', 'signal', 'calm'] as const

function shorten(text: string, limit: number) {
  if (text.length <= limit) return text
  const clipped = text.slice(0, limit - 1).replace(/\s+\S*$/, '').trim()
  return `${clipped}.`
}

function rotateVariant(current: string) {
  const index = VARIANTS.indexOf(current as typeof VARIANTS[number])
  return VARIANTS[(index + 1 + VARIANTS.length) % VARIANTS.length]
}

function safeCaption(content: StudioContent) {
  return `Organize ${content.theme.toLocaleLowerCase('pt-BR')} com clareza, sem culpa e sem promessas fáceis. Comece protegendo o essencial e escolha um próximo passo que você consegue sustentar.`
}

export function regenerateContent(content: StudioContent, reasonCode: string, guidance: string) {
  const current = content.current_version
  let artText = current.art_text
  let caption = current.caption
  let cta = current.cta
  let visualDirection = current.visual_direction
  let designVariant = current.design_variant
  let pages: Array<Pick<StudioPage, 'page_number' | 'art_text' | 'alt_text' | 'visual_direction'>> = current.pages.map((page) => ({
    page_number: page.page_number,
    art_text: page.art_text,
    alt_text: page.alt_text,
    visual_direction: page.visual_direction,
  }))

  if (reasonCode === 'image_off_brand' || reasonCode === 'identity_incorrect' || reasonCode === 'low_quality') {
    designVariant = rotateVariant(current.design_variant)
    visualDirection = `Nova direção visual oficial Zafi: composição limpa, hierarquia forte, logo master intacto e correção objetiva de “${reasonCode}”. ${guidance}`.trim()
    pages = pages.map((page) => ({ ...page, visual_direction: visualDirection }))
  }

  if (reasonCode === 'text_error') {
    artText = artText.replace(/\s+/g, ' ').trim()
    caption = caption.replace(/\s+/g, ' ').trim()
  }

  if (reasonCode === 'mission_misaligned' || reasonCode === 'compliance' || reasonCode === 'dubious_information') {
    artText = 'Clareza primeiro. Um passo de cada vez.'
    caption = safeCaption(content)
    cta = OFFICIAL_CTA
    pages = pages.map((page, index) => ({
      ...page,
      art_text: index === 0 ? artText : shorten(page.art_text, 72),
      alt_text: `Peça educativa Zafi sobre ${content.theme}, sem promessa financeira.`,
    }))
  }

  if (reasonCode === 'repetitive') {
    designVariant = rotateVariant(current.design_variant)
    artText = `Um novo olhar para ${content.theme.toLocaleLowerCase('pt-BR')}`
    pages = pages.map((page, index) => ({
      ...page,
      art_text: index === 0 ? artText : `Passo ${index}: ${shorten(page.art_text, 62)}`,
    }))
  }

  if (reasonCode === 'cta_inadequate') cta = OFFICIAL_CTA

  if (reasonCode === 'other' && guidance.trim()) {
    visualDirection = `${current.visual_direction} Orientação do CEO: ${guidance.trim()}`
    pages = pages.map((page) => ({ ...page, visual_direction: visualDirection }))
  }

  if (reasonCode === 'low_quality') {
    artText = shorten(artText, 64)
    pages = pages.map((page) => ({ ...page, art_text: shorten(page.art_text, 70) }))
  }

  if (!pages.length) {
    pages = [{ page_number: 1, art_text: artText, alt_text: `Peça Zafi: ${artText}`, visual_direction: visualDirection }]
  }

  return {
    artText,
    caption,
    cta,
    hashtags: current.hashtags.length ? current.hashtags : ['#Zafi', '#EducaçãoFinanceira'],
    visualDirection,
    designVariant,
    pages,
  }
}

export function revisionPages(content: StudioContent, artText: string) {
  const current = content.current_version
  if (current.pages.length <= 1) {
    return [{
      page_number: 1,
      art_text: artText,
      alt_text: `Peça Zafi: ${artText}`,
      visual_direction: current.visual_direction,
    }]
  }
  return current.pages.map((page, index) => ({
    page_number: page.page_number,
    art_text: index === 0 ? artText : page.art_text,
    alt_text: index === 0 ? `Peça Zafi: ${artText}` : page.alt_text,
    visual_direction: page.visual_direction,
  }))
}
