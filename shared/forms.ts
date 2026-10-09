// Form definition types and tiny helpers shared by backend and frontend.
// A definition is plain JSON-serialisable data: the API serves it, the UI renders
// from it and the backend validates against it. New countries/variants = new data.

export type FlowType = 'EOR' | 'NON_EOR'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox-group'
  | 'boolean' // Yes / No
  | 'group' // repeatable list of sub-objects (e.g. beneficial owners)

export interface Option {
  value: string
  label: string
}

/** Visibility rule, evaluated against sibling values (the case data, or the group item). */
export type Condition =
  | { field: string; equals?: unknown; in?: unknown[] }
  | { any: Condition[] }

/** Columns on KycCase that can be filled from an answer, for searching. */
export type IndexTarget =
  | 'applicantName'
  | 'nationality'
  | 'passportNumber'
  | 'email'
  | 'companyName'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  helpText?: string
  placeholder?: string
  maxLength?: number
  min?: number
  max?: number
  options?: Option[]
  showIf?: Condition
  /** Copy this answer into a searchable column on every save. */
  index?: IndexTarget
  /** Reviewer sees a flag when the answer equals this value. */
  flagWhen?: unknown
  flagReason?: string
  /** type === 'group' */
  itemFields?: FieldDef[]
  itemLabel?: string
  minItems?: number
}

export interface SectionDef {
  key: string
  title: string
  description?: string
  showIf?: Condition
  fields: FieldDef[]
}

export interface DocumentRequirement {
  key: string
  label: string
  helpText?: string
  required: boolean
  showIf?: Condition
}

export interface DeclarationDef {
  key: string
  text: string
}

export interface FormDefinition {
  country: string // ISO alpha-2
  flow: FlowType
  version: number
  title: string
  description?: string
  sections: SectionDef[]
  documents: DocumentRequirement[]
  declarations: DeclarationDef[]
}

export function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
}

export function isVisible(cond: Condition | undefined, scope: Record<string, unknown>): boolean {
  if (!cond) return true
  if ('any' in cond) return cond.any.some((c) => isVisible(c, scope))
  const v = scope[cond.field]
  if (cond.in) return cond.in.includes(v)
  return v === cond.equals
}
