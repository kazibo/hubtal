import type { FlowType, FormDefinition } from '../../../shared/forms'
import { REVIEWER_TRANSITIONS, isApplicantEditable, type CaseStatus } from '../../../shared/workflow'
import type { AuthUser } from '../auth'
import { db } from '../prisma/db.js';
import { HttpError } from '../errors'
import { getDefinition } from '../forms/registry'
import { computeCompleteness, computeFlags, type Data } from '../forms/validation'

export const caseWithRelations = () =>
    db.orm.public.KycCase
        .include('owner', (owner) =>
            owner.select('id', 'name'),
        )
        .include('assignee', (assignee) =>
            assignee.select('id', 'name'),
        )
        .include('comments', (comments) =>
            comments
                .orderBy((comment) => comment.createdAt.asc())
                .include('author', (author) =>
                    author.select('id', 'name', 'role'),
                ),
        )
        .include('history', (history) =>
            history
                .orderBy((entry) => entry.createdAt.asc())
                .include('changedBy', (user) =>
                    user.select('id', 'name'),
                ),
        )
        .include('documents', (documents) =>
            documents.orderBy((document) => document.createdAt.asc()),
        )
        .include('declarations')

export type CaseWithRelations = Awaited<ReturnType<ReturnType<typeof caseWithRelations>['all']>>[number]

export const caseReference = (n: number) => `KYC-${String(n).padStart(5, '0')}`

export function definitionFor(c: { country: string; flow: string; formVersion: number }): FormDefinition {
  const def = getDefinition(c.country, c.flow as FlowType, c.formVersion)
  if (!def) throw new HttpError(500, `Missing form definition ${c.country}/${c.flow}/v${c.formVersion}`)
  return def
}

/** Loads a case the user is allowed to see. Applicants see their own; reviewers see everything except drafts. */
export async function getCaseFor(user: AuthUser, id: string): Promise<CaseWithRelations> {
  const c = await caseWithRelations().where({ id }).first()
  const notFound = new HttpError(404, 'Case not found')
  if (!c) throw notFound
  if (user.role === 'APPLICANT' && c.ownerId !== user.id) throw notFound
  if (user.role === 'REVIEWER' && c.status === 'DRAFT') throw notFound
  return c
}

export function assertApplicantCanEdit(user: AuthUser, c: { ownerId: string; status: CaseStatus }) {
  if (user.role !== 'APPLICANT' || c.ownerId !== user.id) {
    throw new HttpError(403, 'Only the applicant can change this case')
  }
  if (!isApplicantEditable(c.status)) throw new HttpError(409, 'This case can no longer be edited')
}

export function serializeCase(c: CaseWithRelations, user: AuthUser) {
  const def = definitionFor(c)
  const data = (c.data ?? {}) as Data
  const isReviewer = user.role === 'REVIEWER'
  const completeness = computeCompleteness(def, data, c.documents)

  return {
    id: c.id,
    reference: caseReference(c.caseNumber),
    country: c.country,
    flow: c.flow,
    formVersion: c.formVersion,
    status: c.status,
    data,
    definition: def,
    completeness,
    flags: isReviewer ? computeFlags(def, data) : [],
    owner: c.owner,
    assignee: c.assignee,
    submittedAt: c.submittedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    // Internal notes never leave the reviewer side.
    comments: c.comments
      .filter((x) => isReviewer || x.kind === 'INFO_REQUEST')
      .map((x) => ({
        id: x.id,
        kind: x.kind,
        body: x.body,
        fieldKeys: x.fieldKeys,
        resolvedAt: x.resolvedAt,
        createdAt: x.createdAt,
        author: x.author,
      })),
    history: c.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt,
      changedBy: h.changedBy,
    })),
    documents: c.documents.map((d) => ({
      id: d.id,
      requirementKey: d.requirementKey,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt,
    })),
    declarations: c.declarations.map((d) => ({
      key: d.declarationKey,
      text: d.textSnapshot,
      signatoryName: d.signatoryName,
      acceptedAt: d.acceptedAt,
    })),
    permissions: {
      canEdit: !isReviewer && c.ownerId === user.id && isApplicantEditable(c.status),
      transitions: isReviewer ? REVIEWER_TRANSITIONS[c.status] : [],
    },
  }
}
