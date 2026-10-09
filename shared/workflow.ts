// Case lifecycle. Kept as data so backend and UI agree and it is trivially testable.
//
//   DRAFT ──submit──▶ SUBMITTED ──▶ IN_REVIEW ──▶ APPROVED
//                        │             │  └─────▶ REJECTED
//                        └─────────────┴──▶ INFO_REQUESTED ──applicant resubmits──▶ SUBMITTED

export const CASE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'INFO_REQUESTED',
  'APPROVED',
  'REJECTED',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

/** Moves a reviewer may make. The applicant's own moves (DRAFT/INFO_REQUESTED -> SUBMITTED) go through /submit. */
export const REVIEWER_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: [],
  SUBMITTED: ['IN_REVIEW', 'INFO_REQUESTED', 'REJECTED'],
  IN_REVIEW: ['INFO_REQUESTED', 'APPROVED', 'REJECTED'],
  INFO_REQUESTED: [],
  APPROVED: [],
  REJECTED: [],
}

export const canReviewerMove = (from: CaseStatus, to: CaseStatus): boolean =>
  REVIEWER_TRANSITIONS[from].includes(to)

/** The applicant can edit answers and documents only in these states. */
export const isApplicantEditable = (s: CaseStatus): boolean => s === 'DRAFT' || s === 'INFO_REQUESTED'
