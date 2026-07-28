'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type {
  ContentFactoryPilot,
  ReviewDecision,
  VideoScene,
} from '@/lib/content-factory/types'
import styles from '@/app/admin/content-factory.module.css'

type ReviewRecord = {
  decision: ReviewDecision
  note: string
  decidedAt: string
}

const kindLabels = {
  institutional: 'Institucional',
  educational: 'Educacional',
  viral: 'Viral',
}

const decisionLabels: Record<ReviewDecision, string> = {
  approved: 'Aprovado',
  changes_requested: 'Ajustes solicitados',
  rejected: 'Rejeitado',
}

const pipeline = [
  'Tema',
  'Pesquisa',
  'Priorização',
  'Roteiro',
  'Vídeo',
  'Revisão',
  'Pendente',
  'Aprovado',
  'Publicado',
  'Medição',
  'Aprendizado',
]

function scoreTone(score: number) {
  if (score >= 90) return styles.scoreHigh
  if (score >= 75) return styles.scoreMedium
  return styles.scoreLow
}

function MotionPreview({ pilot }: { pilot: ContentFactoryPilot }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)
  const durationMs = pilot.durationSeconds * 1000

  useEffect(() => {
    setPlaying(false)
    setElapsed(0)
    window.speechSynthesis?.cancel()
  }, [pilot.id])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const next = Date.now() - startedAt.current
      if (next >= durationMs) {
        setElapsed(durationMs)
        setPlaying(false)
        return
      }
      setElapsed(next)
    }, 80)
    return () => window.clearInterval(timer)
  }, [playing, durationMs])

  const scene = useMemo(() => {
    let cursor = 0
    for (const item of pilot.scenes) {
      cursor += item.durationMs
      if (elapsed < cursor) return item
    }
    return pilot.scenes[pilot.scenes.length - 1]
  }, [elapsed, pilot.scenes])

  function toggle() {
    if (playing) {
      setPlaying(false)
      window.speechSynthesis?.cancel()
      return
    }
    const resumeAt = elapsed >= durationMs ? 0 : elapsed
    if (elapsed >= durationMs) setElapsed(0)
    startedAt.current = Date.now() - resumeAt
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(pilot.spokenText)
      utterance.lang = 'pt-BR'
      utterance.rate = pilot.kind === 'viral' ? 1.08 : pilot.kind === 'educational' ? 1 : 0.94
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
    setPlaying(true)
  }

  const progress = Math.min(100, (elapsed / durationMs) * 100)

  return (
    <div className={`${styles.preview} ${styles[`treatment_${scene.treatment}`]}`}>
      <div className={styles.previewGlow} />
      <div className={styles.previewTop}>
        <span className={styles.miniLogo}>zafi<i /></span>
        <span>{kindLabels[pilot.kind]} · {pilot.durationSeconds}s</span>
      </div>
      <div className={styles.sceneCopy} key={`${pilot.id}-${scene.title}`}>
        <small>{scene.kicker}</small>
        <h2>{scene.title}</h2>
        <p>{scene.body}</p>
      </div>
      <div className={styles.captionRail}>
        <span>{pilot.selectedCta}</span>
      </div>
      <div className={styles.previewControls}>
        <button type="button" onClick={toggle} aria-label={playing ? 'Pausar preview' : 'Reproduzir preview'}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <div><i style={{ width: `${progress}%` }} /></div>
        <time>{Math.round(elapsed / 1000)}s</time>
      </div>
    </div>
  )
}

function QualityGrid({ pilot }: { pilot: ContentFactoryPilot }) {
  const labels: Record<keyof ContentFactoryPilot['quality'], string> = {
    clarity: 'Clareza',
    retention: 'Retenção',
    branding: 'Marca',
    cta: 'CTA',
    spelling: 'Ortografia',
    visual: 'Visual',
    accessibility: 'Acessibilidade',
  }
  return (
    <div className={styles.qualityGrid}>
      {(Object.keys(pilot.quality) as Array<keyof typeof pilot.quality>).map((key) => (
        <div key={key}>
          <span>{labels[key]}</span>
          <strong>{pilot.quality[key]}</strong>
          <i><b style={{ width: `${pilot.quality[key]}%` }} /></i>
        </div>
      ))}
    </div>
  )
}

export default function ContentFactoryReview({ pilots }: { pilots: ContentFactoryPilot[] }) {
  const [selectedId, setSelectedId] = useState(pilots[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [reviews, setReviews] = useState<Record<string, ReviewRecord>>({})
  const [savedMessage, setSavedMessage] = useState('')

  const selected = pilots.find((pilot) => pilot.id === selectedId) ?? pilots[0]

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('zafi_content_factory_reviews_v1')
      if (stored) setReviews(JSON.parse(stored))
    } catch {
      setReviews({})
    }
  }, [])

  useEffect(() => {
    setNote(reviews[selectedId]?.note ?? '')
    setSavedMessage('')
  }, [selectedId, reviews])

  function decide(decision: ReviewDecision) {
    const next = {
      ...reviews,
      [selected.id]: {
        decision,
        note: note.trim(),
        decidedAt: new Date().toISOString(),
      },
    }
    setReviews(next)
    window.localStorage.setItem('zafi_content_factory_reviews_v1', JSON.stringify(next))
    setSavedMessage(`${decisionLabels[decision]}. A decisão foi salva neste navegador e não publica o vídeo.`)
  }

  if (!selected) return null
  const currentReview = reviews[selected.id]

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>zafi<i /></span><b>FACTORY</b></div>
        <div className={styles.northStar}><small>North Star</small><strong>100 visitantes orgânicos / dia</strong></div>
        <nav><a href="/admin">CEO Cockpit</a><span>3 pilotos · aprovação humana</span></nav>
      </header>

      <section className={styles.pipeline} aria-label="Fluxo da fábrica">
        {pipeline.map((stage, index) => (
          <div className={index <= 6 ? styles.pipelineDone : ''} key={stage}>
            <i>{index + 1}</i><span>{stage}</span>
          </div>
        ))}
      </section>

      <div className={styles.layout}>
        <aside className={styles.queue}>
          <header><small>Fila do Conselho</small><h1>Três decisões.</h1><p>Nenhum item será publicado por esta tela.</p></header>
          <div className={styles.queueList}>
            {pilots.map((pilot) => (
              <button
                className={`${styles.queueItem} ${pilot.id === selected.id ? styles.queueItemActive : ''}`}
                key={pilot.id}
                type="button"
                onClick={() => setSelectedId(pilot.id)}
              >
                <span className={styles.queueIndex}>0{pilots.indexOf(pilot) + 1}</span>
                <span><small>{kindLabels[pilot.kind]}</small><strong>{pilot.title}</strong><em>{reviews[pilot.id] ? decisionLabels[reviews[pilot.id].decision] : 'Pendente'}</em></span>
                <b className={scoreTone(pilot.score)}>{pilot.score}</b>
              </button>
            ))}
          </div>
          <div className={styles.governance}>
            <span>TRAVA ATIVA</span>
            <strong>Publicação automática desabilitada</strong>
            <p>Aprovar libera somente o handoff para o Agente de Marketing.</p>
          </div>
        </aside>

        <section className={styles.stage}>
          <div className={styles.stageHeader}>
            <div><small>{kindLabels[selected.kind]} · {selected.status.replace('_', ' ')}</small><h1>{selected.title}</h1><p>{selected.objective}</p></div>
            <div className={`${styles.heroScore} ${scoreTone(selected.score)}`}><span>QUALITY</span><strong>{selected.score}</strong><small>/100</small></div>
          </div>

          <div className={styles.reviewGrid}>
            <section className={styles.playerPanel}>
              {selected.deliverables ? (
                <video
                  className={styles.realVideo}
                  controls
                  playsInline
                  preload="metadata"
                  poster={selected.deliverables.staticImageUrl}
                  src={selected.deliverables.videoUrl}
                >
                  Seu navegador não conseguiu reproduzir o vídeo.
                </video>
              ) : <MotionPreview pilot={selected} />}
              <div className={styles.providerStrip}>
                <div><small>Fornecedor</small><strong>{selected.provider.label}</strong></div>
                <div><small>Tempo</small><strong>{selected.provider.generationTimeMs} ms</strong></div>
                <div><small>Custo estimado</small><strong>R$ {selected.provider.estimatedCostBrl.toFixed(2).replace('.', ',')}</strong></div>
                <div><small>Formato</small><strong>9:16 · pt-BR</strong></div>
              </div>
            </section>

            <section className={styles.scriptPanel}>
              <div className={styles.panelHeading}><small>ROTEIRO APROVADO PELO COMPLIANCE</small><span>v{selected.trace.scriptVersion}</span></div>
              <blockquote>{selected.selectedHook}</blockquote>
              <p>{selected.spokenText}</p>
              <div className={styles.ctaBox}><small>CTA selecionado</small><strong>{selected.selectedCta}</strong></div>
              <dl>
                <div><dt>Público</dt><dd>{selected.audience}</dd></div>
                <div><dt>Tema</dt><dd>{selected.topic}</dd></div>
                <div><dt>Descrição</dt><dd>{selected.description}</dd></div>
              </dl>
            </section>
          </div>

          {selected.deliverables && (
            <section className={styles.assetShelf}>
              <div className={styles.panelHeading}><small>CAMPANHA COMPLETA</small><span>Vídeo · 7 slides · arte · 3 Stories</span></div>
              <div className={styles.assetGrid}>
                <a href={selected.deliverables.videoUrl} target="_blank" rel="noreferrer"><strong>Vídeo 9:16</strong><span>22 segundos · MP4</span></a>
                <a href={selected.deliverables.staticImageUrl} target="_blank" rel="noreferrer"><strong>Arte estática</strong><span>1080 × 1350</span></a>
                <a href={selected.deliverables.carouselUrls[0]} target="_blank" rel="noreferrer"><strong>Carrossel</strong><span>7 páginas</span></a>
                <a href={selected.deliverables.storyUrls[0]} target="_blank" rel="noreferrer"><strong>Stories</strong><span>3 peças 9:16</span></a>
              </div>
              <p className={styles.publicationLock}>Publicação bloqueada até aprovação explícita do CEO e autenticação das contas oficiais.</p>
            </section>
          )}
          <section className={styles.lab}>
            <div className={styles.panelHeading}><small>LABORATÓRIO CRIATIVO</small><span>3 hooks · 2 CTAs · 3 thumbnails · 2 edições</span></div>
            <div className={styles.labGrid}>
              <div><h3>Hooks</h3>{selected.hooks.map((hook, index) => <p key={hook}><i>{index + 1}</i>{hook}</p>)}</div>
              <div><h3>CTAs</h3>{selected.ctas.map((cta, index) => <p key={cta}><i>{index + 1}</i>{cta}</p>)}<h3 className={styles.editTitle}>Edição</h3>{selected.editStyles.map((edit) => <span className={styles.tag} key={edit}>{edit}</span>)}</div>
              <div className={styles.thumbnails}><h3>Thumbnails</h3><div>{selected.thumbnailUrls.map((url, index) => <figure key={url}><Image src={url} width={540} height={960} sizes="(max-width: 760px) 28vw, 140px" alt={`Thumbnail ${index + 1}: ${selected.thumbnailText}`} /><figcaption>Opção {index + 1}</figcaption></figure>)}</div></div>
            </div>
          </section>

          <section className={styles.assurance}>
            <div><div className={styles.panelHeading}><small>QUALITY REVIEW</small><span className={styles.approved}>Aprovado</span></div><QualityGrid pilot={selected} /></div>
            <div className={styles.compliance}><div className={styles.panelHeading}><small>COMPLIANCE</small><span className={styles.approved}>Sem bloqueios</span></div><strong>Conteúdo seguro para revisão executiva</strong><p>Sem promessa de crédito, score, desconto, prazo ou resultado financeiro. Sem dados pessoais ou depoimentos inventados.</p><time>{new Date(selected.compliance.reviewedAt).toLocaleString('pt-BR')}</time></div>
          </section>

          <section className={styles.decision}>
            <div><small>DECISÃO DO CEO</small><h2>Aprovar não é publicar.</h2><p>A decisão fica salva neste navegador para a avaliação do protótipo. A publicação permanece manual e separada.</p></div>
            <div className={styles.decisionForm}>
              <label htmlFor="ceo-note">Observação para a equipe</label>
              <textarea id="ceo-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explique o ajuste ou registre o motivo da decisão." />
              <div className={styles.buttons}>
                <button className={styles.reject} type="button" onClick={() => decide('rejected')}>Rejeitar</button>
                <button className={styles.adjust} type="button" onClick={() => decide('changes_requested')}>Solicitar ajustes</button>
                <button className={styles.approve} type="button" onClick={() => decide('approved')}>Aprovar</button>
              </div>
              {(savedMessage || currentReview) && <p className={styles.saved}>{savedMessage || `${decisionLabels[currentReview.decision]} · decisão já registrada.`}</p>}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
