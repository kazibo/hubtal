import type { FieldDef, FormDefinition } from '../../shared/forms'
import type { CaseStatus, FlowType } from './types'

export const STATUS_LABELS: Record<CaseStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  INFO_REQUESTED: 'Info requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const flowLabel = (f: FlowType) => (f === 'EOR' ? 'EOR' : 'Non-EOR')

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** Top-level field key -> label, for info-request chips. */
export function fieldLabels(def: FormDefinition): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of def.sections) for (const f of s.fields) out[f.key] = f.label
  return out
}

export const allFields = (def: FormDefinition): FieldDef[] => def.sections.flatMap((s) => s.fields)
