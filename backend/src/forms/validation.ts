import {
  isEmpty,
  isVisible,
  type FieldDef,
  type FormDefinition,
  type IndexTarget,
  type SectionDef,
} from '../../../shared/forms'

export type Data = Record<string, unknown>
export interface Issue {
  path: string
  message: string
}
export interface Problem {
  path: string
  label: string
  message: string
}
export interface SectionProgress {
  key: string
  title: string
  complete: boolean
  missing: Problem[]
}
export interface Completeness {
  sections: SectionProgress[]
  documents: { key: string; label: string; required: boolean; uploadedCount: number }[]
  missingDocuments: { key: string; label: string }[]
  percent: number
  complete: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9 ()\-]{6,20}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const isPlainObject = (v: unknown): v is Data => typeof v === 'object' && v !== null && !Array.isArray(v)

function validDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/**
 * Checks one non-empty value. `strict` (submit) also checks formats; drafts only check
 * structure so half-typed input (an unfinished email) can still be saved.
 */
export function checkValue(field: FieldDef, value: unknown, strict: boolean): string | null {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'date': {
      if (typeof value !== 'string') return 'Must be text'
      const max = field.maxLength ?? (field.type === 'textarea' ? 5000 : 300)
      if (value.length > max) return `Must be at most ${max} characters`
      if (!strict) return null
      if (field.type === 'email' && !EMAIL_RE.test(value)) return 'Enter a valid email address'
      if (field.type === 'phone' && !PHONE_RE.test(value)) return 'Enter a valid phone number'
      if (field.type === 'date' && !validDate(value)) return 'Enter a valid date'
      return null
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'Must be a number'
      if (field.min !== undefined && value < field.min) return `Must be at least ${field.min}`
      if (field.max !== undefined && value > field.max) return `Must be at most ${field.max}`
      return null
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : 'Must be yes or no'
    case 'select':
    case 'radio':
      return typeof value === 'string' && (field.options ?? []).some((o) => o.value === value)
        ? null
        : 'Choose one of the options'
    case 'checkbox-group':
      return Array.isArray(value) &&
        value.every((v) => typeof v === 'string' && (field.options ?? []).some((o) => o.value === v))
        ? null
        : 'Choose from the listed options'
    case 'group':
      return null // handled by the walker
  }
}

interface Evaluated {
  path: string
  label: string
  field: FieldDef
  value: unknown
  status: 'ok' | 'missing' | 'invalid' | 'skipped'
  message?: string
}

function evaluateFields(
  fields: FieldDef[],
  scope: Data,
  basePath: string,
  labelPrefix: string,
  strict: boolean,
  out: Evaluated[],
): void {
  for (const field of fields) {
    if (!isVisible(field.showIf, scope)) continue
    const path = basePath ? `${basePath}.${field.key}` : field.key
    const label = labelPrefix ? `${labelPrefix} · ${field.label}` : field.label
    const value = scope[field.key]

    if (field.type === 'group') {
      if (!isEmpty(value) && !Array.isArray(value)) {
        out.push({ path, label, field, value, status: 'invalid', message: 'Must be a list' })
        continue
      }
      const items = Array.isArray(value) ? value : []
      const min = field.minItems ?? (field.required ? 1 : 0)
      if (items.length < min) {
        out.push({
          path,
          label,
          field,
          value,
          status: 'missing',
          message: `Add at least ${min} ${(field.itemLabel ?? 'item').toLowerCase()}`,
        })
      }
      items.forEach((item, i) => {
        const itemPath = `${path}.${i}`
        if (!isPlainObject(item)) {
          out.push({ path: itemPath, label, field, value: item, status: 'invalid', message: 'Invalid entry' })
          return
        }
        evaluateFields(field.itemFields ?? [], item, itemPath, `${field.itemLabel ?? field.label} ${i + 1}`, strict, out)
      })
      continue
    }

    if (isEmpty(value)) {
      out.push({
        path,
        label,
        field,
        value,
        status: field.required ? 'missing' : 'skipped',
        message: 'This field is required',
      })
      continue
    }
    const message = checkValue(field, value, strict)
    out.push(message ? { path, label, field, value, status: 'invalid', message } : { path, label, field, value, status: 'ok' })
  }
}

const visibleSections = (def: FormDefinition, data: Data): SectionDef[] =>
  def.sections.filter((s) => isVisible(s.showIf, data))

/** Drops unknown keys, hidden fields and empty values. Run before validating or storing. */
export function sanitizeData(def: FormDefinition, data: Data): Data {
  const sanitizeFields = (fields: FieldDef[], scope: Data): Data => {
    const out: Data = {}
    for (const f of fields) {
      if (!isVisible(f.showIf, scope)) continue
      const v = scope[f.key]
      if (isEmpty(v)) continue
      if (f.type === 'group' && Array.isArray(v)) {
        out[f.key] = v.map((item) => (isPlainObject(item) ? sanitizeFields(f.itemFields ?? [], item) : item))
      } else {
        out[f.key] = v
      }
    }
    return out
  }
  const out: Data = {}
  for (const s of visibleSections(def, data)) Object.assign(out, sanitizeFields(s.fields, data))
  return out
}

export function validateData(def: FormDefinition, data: Data, mode: 'draft' | 'submit'): Issue[] {
  const strict = mode === 'submit'
  const out: Evaluated[] = []
  for (const s of visibleSections(def, data)) evaluateFields(s.fields, data, '', '', strict, out)
  return out
    .filter((r) => r.status === 'invalid' || (strict && r.status === 'missing'))
    .map((r) => ({ path: r.path, message: r.message ?? 'Invalid' }))
}

export function computeCompleteness(
  def: FormDefinition,
  data: Data,
  docs: { requirementKey: string }[],
): Completeness {
  const sections: SectionProgress[] = visibleSections(def, data).map((s) => {
    const out: Evaluated[] = []
    evaluateFields(s.fields, data, '', '', true, out)
    const missing = out
      .filter((r) => r.status === 'missing' || r.status === 'invalid')
      .map((r) => ({ path: r.path, label: r.label, message: r.message ?? '' }))
    return { key: s.key, title: s.title, complete: missing.length === 0, missing }
  })

  const documents = def.documents
    .filter((d) => isVisible(d.showIf, data))
    .map((d) => ({
      key: d.key,
      label: d.label,
      required: d.required,
      uploadedCount: docs.filter((x) => x.requirementKey === d.key).length,
    }))
  const missingDocuments = documents
    .filter((d) => d.required && d.uploadedCount === 0)
    .map((d) => ({ key: d.key, label: d.label }))

  const requiredDocs = documents.filter((d) => d.required).length
  const done = sections.filter((s) => s.complete).length + (requiredDocs - missingDocuments.length)
  const total = sections.length + requiredDocs

  return {
    sections,
    documents,
    missingDocuments,
    percent: total ? Math.round((done / total) * 100) : 100,
    complete: sections.every((s) => s.complete) && missingDocuments.length === 0,
  }
}

/** Answers a reviewer should look at twice (defined per field with flagWhen). */
export function computeFlags(def: FormDefinition, data: Data): Problem[] {
  const out: Evaluated[] = []
  for (const s of visibleSections(def, data)) evaluateFields(s.fields, data, '', '', false, out)
  return out
    .filter((r) => r.status === 'ok' && r.field.flagWhen !== undefined && r.value === r.field.flagWhen)
    .map((r) => ({ path: r.path, label: r.label, message: r.field.flagReason ?? 'Needs attention' }))
}

export type IndexedColumns = Record<IndexTarget, string | null>

/** Values to copy into the searchable columns of KycCase. First non-empty answer wins. */
export function extractIndexed(def: FormDefinition, data: Data): IndexedColumns {
  const result: IndexedColumns = {
    applicantName: null,
    nationality: null,
    passportNumber: null,
    email: null,
    companyName: null,
  }
  for (const s of def.sections) {
    for (const f of s.fields) {
      if (!f.index || result[f.index] !== null) continue
      const v = data[f.key]
      if (typeof v !== 'string' || v.trim() === '') continue
      result[f.index] =
        f.index === 'passportNumber' ? v.replace(/\s+/g, '').toUpperCase() : v.trim()
    }
  }
  return result
}
