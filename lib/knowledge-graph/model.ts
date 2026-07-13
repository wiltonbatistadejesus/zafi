export const ENTITY_TYPE_KEYS = [
  'institution', 'product', 'debt_type', 'renegotiation_path', 'question', 'answer',
  'glossary_term', 'tool', 'partner', 'article', 'page', 'category',
] as const

export type EntityTypeKey = typeof ENTITY_TYPE_KEYS[number]
export type EntityStatus = 'draft' | 'review' | 'published' | 'archived'
export type EditorialStatus = 'draft' | 'technical_review' | 'legal_review' | 'approved' | 'retired'

export const RELATION_TYPE_KEYS = [
  'offers', 'offered_by', 'creates_debt_type', 'renegotiated_via', 'answers', 'answered_by',
  'defines', 'calculated_by', 'recommended_partner', 'about', 'mentions', 'related_to',
  'broader_than', 'narrower_than', 'supported_by',
] as const

export type RelationTypeKey = typeof RELATION_TYPE_KEYS[number]

export type EntityId = string & { readonly __brand: 'EntityId' }
export type SourceId = string & { readonly __brand: 'SourceId' }

export interface KnowledgeEntity {
  id: EntityId
  type: EntityTypeKey
  slug: string
  name: string
  description?: string
  status: EntityStatus
  canonicalUrl?: string
  version: number
  publishedAt?: string
  reviewedAt?: string
  aliases: readonly EntityAlias[]
}

export interface EntityAlias {
  value: string
  locale: string
  kind: 'synonym' | 'acronym' | 'former_name' | 'search_term'
}

export interface EntityRelation {
  sourceId: EntityId
  relation: RelationTypeKey
  targetId: EntityId
  rank: number
  confidence: number
  validFrom?: string
  validUntil?: string
  reviewedAt?: string
}

export interface KnowledgeClaim {
  id: string
  subjectId: EntityId
  predicate: string
  objectId?: EntityId
  value?: unknown
  status: 'draft' | 'verified' | 'disputed' | 'expired' | 'archived'
  confidence: number
  sourceIds: readonly SourceId[]
  validFrom?: string
  validUntil?: string
  reviewedAt?: string
}

export interface KnowledgeSource {
  id: SourceId
  url: string
  title: string
  publisher: string
  type: 'law' | 'regulator' | 'institution' | 'research' | 'news' | 'editorial' | 'dataset' | 'other'
  reliabilityTier: 1 | 2 | 3 | 4 | 5
  retrievedAt: string
  lastVerifiedAt?: string
}

export interface EntityPageProjection {
  route: string
  templateKey: string
  locale: string
  primaryEntityId: EntityId
  relatedEntityIds: readonly EntityId[]
  schemaOrgTypes: readonly string[]
}

export interface RetrievalContext {
  entities: readonly KnowledgeEntity[]
  relations: readonly EntityRelation[]
  claims: readonly KnowledgeClaim[]
  sources: readonly KnowledgeSource[]
  generatedAt: string
}

export const isEntityTypeKey = (value: string): value is EntityTypeKey =>
  (ENTITY_TYPE_KEYS as readonly string[]).includes(value)

export const isRelationTypeKey = (value: string): value is RelationTypeKey =>
  (RELATION_TYPE_KEYS as readonly string[]).includes(value)
