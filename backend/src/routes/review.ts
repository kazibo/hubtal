import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { canReviewerMove } from '../../../shared/workflow'
import { requireReviewer } from '../auth'
import { db } from '../prisma/db.js';
import { HttpError } from '../errors'
import { computeCompleteness, type Data } from '../forms/validation'
import { definitionFor, getCaseFor, serializeCase } from '../services/caseService'

export const reviewRoutes: FastifyPluginAsync = async (app) => {
  // Internal note: reviewers only, never shown to the applicant.
  app.post<{ Params: { id: string } }>('/cases/:id/notes', async (req) => {
    requireReviewer(req)
    const body = z.object({ body: z.string().trim().min(1).max(5000) }).parse(req.body)
    const c = await getCaseFor(req.user, req.params.id)
    await db.orm.public.CaseComment.create({
      caseId: c.id, authorId: req.user.id, kind: 'INTERNAL_NOTE', body: body.body, fieldKeys: [],
    })
    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })

  // Ask the applicant for more information. Optionally points at specific fields.
  app.post<{ Params: { id: string } }>('/cases/:id/info-requests', async (req) => {
    requireReviewer(req)
    const body = z
      .object({
        message: z.string().trim().min(1).max(5000),
        fieldKeys: z.array(z.string()).max(100).default([]),
      })
      .parse(req.body)
    const c = await getCaseFor(req.user, req.params.id)
    if (!canReviewerMove(c.status, 'INFO_REQUESTED')) {
      throw new HttpError(409, `Cannot request information while the case is ${c.status}`)
    }
    const def = definitionFor(c)
    const known = new Set(def.sections.flatMap((s) => s.fields.map((f) => f.key)))
    const unknown = body.fieldKeys.filter((k) => !known.has(k))
    if (unknown.length) throw new HttpError(400, `Unknown fields: ${unknown.join(', ')}`)

    await db.transaction(async (tx) => {
      await tx.orm.public.CaseComment.create({
        caseId: c.id,
        authorId: req.user.id,
        kind: 'INFO_REQUEST',
        body: body.message,
        fieldKeys: body.fieldKeys,
      });

      await tx.orm.public.KycCase.where({ id: c.id }).update({
        status: 'INFO_REQUESTED',
        assigneeId: c.assigneeId ?? req.user.id
      });

      await tx.orm.public.StatusChange.create({
        caseId: c.id,
        fromStatus: c.status,
        toStatus: 'INFO_REQUESTED',
        changedById: req.user.id,
        reason: 'Additional information requested',
      });
    });

    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })

  // Start review, approve or reject. (Requesting info has its own endpoint because it carries a message.)
  app.post<{ Params: { id: string } }>('/cases/:id/status', async (req) => {
    requireReviewer(req)
    const body = z
      .object({
        status: z.enum(['IN_REVIEW', 'APPROVED', 'REJECTED']),
        reason: z.string().trim().max(2000).optional(),
      })
      .parse(req.body)
    const c = await getCaseFor(req.user, req.params.id)
    if (!canReviewerMove(c.status, body.status)) {
      throw new HttpError(409, `Cannot move a ${c.status} case to ${body.status}`)
    }
    if (body.status === 'REJECTED' && !body.reason) {
      throw new HttpError(422, 'A reason is required when rejecting a case')
    }
    if (body.status === 'APPROVED') {
      const completeness = computeCompleteness(definitionFor(c), (c.data ?? {}) as Data, c.documents)
      if (!completeness.complete) throw new HttpError(422, 'Cannot approve an incomplete case', { completeness })
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.KycCase.where({id: c.id}).update({
        status: body.status, assigneeId: c.assigneeId ?? req.user.id
      });

      await tx.orm.public.StatusChange.create({
        caseId: c.id,
        fromStatus: c.status,
        toStatus: body.status,
        changedById: req.user.id,
        reason: body.reason || null,
      });
    })
    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })
}
