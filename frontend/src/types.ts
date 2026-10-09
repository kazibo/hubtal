import type { FlowType, FormDefinition } from '../../shared/forms'
import type { CaseStatus } from '../../shared/workflow'

export type { CaseStatus, FlowType, FormDefinition }
export type Data = Record<string, unknown>

export interface User {
  id: string
  name: string
  email: string
  role: 'APPLICANT' | 'REVIEWER'
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

export interface CaseComment {
  id: string
  kind: 'INTERNAL_NOTE' | 'INFO_REQUEST'
  body: string
  fieldKeys: string[]
  resolvedAt: string | null
  createdAt: string
  author: { id: string; name: string; role: string }
}

export interface HistoryItem {
  id: string
  fromStatus: CaseStatus | null
  toStatus: CaseStatus
  reason: string | null
  createdAt: string
  changedBy: { id: string; name: string }
}

export interface DocumentItem {
  id: string
  requirementKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export interface CaseDetail {
  id: string
  reference: string
  country: string
  flow: FlowType
  formVersion: number
  status: CaseStatus
  data: Data
  definition: FormDefinition
  completeness: Completeness
  flags: Problem[]
  owner: { id: string; name: string }
  assignee: { id: string; name: string } | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  comments: CaseComment[]
  history: HistoryItem[]
  documents: DocumentItem[]
  declarations: { key: string; text: string; signatoryName: string; acceptedAt: string }[]
  permissions: { canEdit: boolean; transitions: CaseStatus[] }
}

export interface CaseListItem {
  id: string
  reference: string
  country: string
  flow: FlowType
  status: CaseStatus
  applicantName: string | null
  companyName: string | null
  nationality: string | null
  ownerName: string
  assigneeName: string | null
  submittedAt: string | null
  updatedAt: string
}

export interface FormListItem {
  country: string
  countryName: string
  flow: FlowType
  title: string
  description: string
  version: number
}
