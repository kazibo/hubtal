import { STATUS_LABELS } from '../format'
import type { CaseStatus } from '../types'

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
}
