import 'server-only'

import path from 'path'
import { Resvg } from '@resvg/resvg-js'
import type { StudioContent, StudioPage, StudioVersion } from './types'

type ArtworkInput = {
  content: StudioContent
  version: StudioVersion
  page: StudioPage
  logoDataUri: string
}

const colors = {
  blue: '#1565ff',
  navy: '#0f172a',
  light: '#e9f0ff',
  white: '#ffffff',
  cyan: '#72e8ff',
  signal: '#ffcf5a',
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character)
}

function wrapText(value: string, maxCharacters: number) {
  const words = value.trim().split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxCharacters && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 6)
}

function decoration(variant: string, width: number, height: number) {
  if (variant === 'split') {
    return `<path d="M ${Math.round(width * .68)} 0 H ${width} V ${height} H ${Math.round(width * .82)} Z" fill="${colors.navy}"/>
      <circle cx="${Math.round(width * .86)}" cy="${Math.round(height * .2)}" r="84" fill="none" stroke="${colors.cyan}" stroke-width="24"/>`
  }
  if (variant === 'signal') {
    return `<circle cx="${width - 65}" cy="${Math.round(height * .25)}" r="230" fill="${colors.signal}"/>`
  }
  if (variant === 'ledger') {
    return [0, 1, 2, 3].map((index) => {
      const y = 170 + index * 64
      const length = [250, 320, 190, 285][index]
      return `<text x="${width - 440}" y="${y + 12}" font-size="22" font-weight="700" fill="${colors.blue}">0${index + 1}</text>
        <rect x="${width - 385}" y="${y}" width="${length}" height="16" rx="8" fill="${index === 2 ? colors.cyan : colors.blue}"/>`
    }).join('')
  }
  if (variant === 'path') {
    return `<path d="M ${width - 410} 330 L ${width - 70} 145" fill="none" stroke="${colors.blue}" stroke-width="18" stroke-linecap="round"/>
      <circle cx="${width - 90}" cy="155" r="42" fill="${colors.cyan}" stroke="${colors.white}" stroke-width="12"/>`
  }
  if (variant === 'grid') {
    return [0, 1, 2, 3].map((index) => {
      const x = width - 390 + (index % 2) * 155
      const y = 130 + Math.floor(index / 2) * 155
      return `<rect x="${x}" y="${y}" width="125" height="125" rx="24" fill="${index === 0 ? colors.blue : 'none'}" stroke="${index === 0 ? colors.blue : '#b8caff'}" stroke-width="6"/>`
    }).join('')
  }
  return `<circle cx="${width - 80}" cy="80" r="270" fill="url(#brandGlow)"/>`
}

function artworkSvg({ content, version, page, logoDataUri }: ArtworkInput) {
  const width = content.format.width
  const height = content.format.height
  const portrait = height > 1500
  const dark = version.design_variant === 'split'
  const headlineSize = page.art_text.length > 78 ? 62 : page.art_text.length > 48 ? 76 : portrait ? 102 : 92
  const maxCharacters = Math.max(15, Math.floor((width * (dark ? .56 : .70)) / (headlineSize * .54)))
  const lines = wrapText(page.art_text, maxCharacters)
  const headlineY = portrait ? 650 : 520
  const lineHeight = Math.round(headlineSize * 1.08)
  const proof = `${content.network.slug.toUpperCase()} / ${content.format.slug.toUpperCase()} / V${version.version_number} / P${String(page.page_number).padStart(2, '0')}`

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M 54 0 L 0 0 0 54" fill="none" stroke="#1565ff" stroke-opacity=".055" stroke-width="2"/></pattern>
      <radialGradient id="brandGlow" cx="35%" cy="35%"><stop offset="0" stop-color="#fff"/><stop offset=".52" stop-color="#cddcff"/><stop offset="1" stop-color="${colors.cyan}"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="${dark ? colors.light : colors.white}"/>
    <rect width="100%" height="100%" fill="url(#grid)"/>
    ${decoration(version.design_variant, width, height)}
    <image href="${logoDataUri}" x="68" y="58" width="190" height="72" preserveAspectRatio="xMinYMid meet"/>
    <rect x="${width - 355}" y="70" width="285" height="52" rx="26" fill="${dark ? colors.white : colors.light}"/>
    <text x="${width - 212}" y="104" text-anchor="middle" font-family="Inter" font-size="18" font-weight="700" letter-spacing="1.2" fill="${colors.blue}">${escapeXml(content.category.label.toUpperCase())}</text>
    <text x="68" y="${headlineY - 120}" font-family="Inter" font-size="24" font-weight="700" letter-spacing="3" fill="${colors.blue}">${escapeXml(content.theme.toUpperCase())}</text>
    <rect x="68" y="${headlineY - 82}" width="96" height="12" rx="6" fill="${colors.blue}"/>
    <text x="68" y="${headlineY}" font-family="Inter" font-size="${headlineSize}" font-weight="700" letter-spacing="-2.5" fill="${colors.navy}">
      ${lines.map((line, index) => `<tspan x="68" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}
    </text>
    <line x1="68" y1="${height - 165}" x2="${width - 68}" y2="${height - 165}" stroke="${colors.navy}" stroke-width="4"/>
    <text x="68" y="${height - 112}" font-family="Inter" font-size="25" font-weight="700" fill="${colors.navy}">Zafi. O seu bolso agradece.</text>
    <text x="68" y="${height - 78}" font-family="Inter" font-size="19" fill="#52637d">Diagn&#243;stico financeiro gratuito em meuzafi.com.br</text>
    <circle cx="${width - 98}" cy="${height - 112}" r="31" fill="${colors.blue}"/><path d="M ${width - 111} ${height - 112} H ${width - 86} M ${width - 96} ${height - 123} L ${width - 85} ${height - 112} ${width - 96} ${height - 101}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="68" y="${height - 30}" font-family="Inter" font-size="14" letter-spacing="1" fill="#718096">${escapeXml(proof)}</text>
    <text x="${width - 68}" y="${height - 30}" text-anchor="end" font-family="Inter" font-size="14" letter-spacing="1" fill="#718096">APROVA&#199;&#195;O HUMANA OBRIGAT&#211;RIA</text>
  </svg>`
}

export async function renderStudioArtwork({ content, version, page, logoDataUri }: ArtworkInput) {
  const svg = artworkSvg({ content, version, page, logoDataUri })
  const fontFile = path.join(process.cwd(), 'public', 'brand', 'fonts', 'InterVariable.ttf')
  const renderer = new Resvg(svg, {
    font: { fontFiles: [fontFile], loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
  return Buffer.from(renderer.render().asPng())
}
