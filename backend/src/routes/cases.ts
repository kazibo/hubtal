import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CASE_STATUSES } from '../../../shared/workflow'
import { db } from "../prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { HttpError } from '../errors'
import { getDefinition } from '../forms/registry'
import {
  computeCompleteness,
  extractIndexed,
  sanitizeData,
  validateData,
  type Data,
} from '../forms/validation'
import {
  assertApplicantCanEdit,
  caseReference,
  definitionFor,
  getCaseFor,
  serializeCase,
} from '../services/caseService'
import type {InputJsonValue} from "@prisma/client/runtime/client";

const flowSchema = z.enum(['EOR', 'NON_EOR'])

const listQuery = z.object({
  status: z.enum(CASE_STATUSES).optional(),
  flow: flowSchema.optional(),
  country: z.string().length(2).optional(),
  q: z.string().trim().max(100).optional(),
})

export const caseRoutes: FastifyPluginAsync = async (app) => {
  // List: applicants get their own cases; reviewers get everything that has been submitted.
  app.get('/cases', async (req) => {
    const q = listQuery.parse(req.query)
    const isReviewer = req.user.role === 'REVIEWER'
    let rows = db.orm.public.KycCase;

    if (isReviewer) {
      if (q.status && q.status !== "DRAFT") {
        // @ts-ignore
        rows = rows.where((k) => k.status.eq(q.status));
      } else {
        rows = rows.where((k) => k.status.neq("DRAFT"));
      }
    } else {
      rows = rows.where((k) => k.ownerId.eq(req.user.id));

      if (q.status) {
        // @ts-ignore
        rows = rows.where((k) => k.status.eq(q.status));
      }
    }

    if (q.flow) {
      // @ts-ignore
      rows = rows.where((k) => k.flow.eq(q.flow));
    }

    if (q.country) {
      // @ts-ignore
      rows = rows.where((k) => k.country.eq(q.country.toUpperCase()));
    }

    if (q.q) {
      const term = q.q;
      const normalizedTerm = term.replace(/\s+/g, "");
      const ref = /^(?:kyc-)?0*(\d+)$/i.exec(term);

      rows = rows.where((k) => {
        const conditions = [
          k.applicantName.ilike(`%${term}%`),
          k.companyName.ilike(`%${term}%`),
          k.email.ilike(`%${term}%`),
          k.passportNumber.ilike(`%${normalizedTerm}%`),
        ];

        if (ref) {
          conditions.push(k.caseNumber.eq(Number(ref[1])));
        }

        return or(...conditions);
      });
    }

    const result = await rows
        .include("assignee", (assignee) => assignee.select("name"))
        .include("owner", (owner) => owner.select("name"))
        .orderBy((k) => k.updatedAt.desc())
        .limit(200)
        .all();

    return result.map((r) => ({
      id: r.id,
      reference: caseReference(r.caseNumber),
      country: r.country,
      flow: r.flow,
      status: r.status,
      applicantName: r.applicantName,
      companyName: r.companyName,
      nationality: r.nationality,
      ownerName: r.owner?.name ?? null,
      assigneeName: r.assignee?.name ?? null,
      submittedAt: r.submittedAt,
      updatedAt: r.updatedAt,
    }))
  })

  // Start a case for a country + flow.
  app.post('/cases', async (req, reply) => {
    if (req.user.role !== 'APPLICANT') throw new HttpError(403, 'Only applicants can start cases')
    const body = z
      .object({ country: z.string().length(2).transform((s) => s.toUpperCase()), flow: flowSchema })
      .parse(req.body)
    const def = getDefinition(body.country, body.flow)
    if (!def) throw new HttpError(400, 'No form is available for that country and flow')

    const created = await db.orm.public.KycCase.create({
      country: body.country,
      flow: body.flow,
      formVersion: def.version,
      ownerId: req.user.id,
      data: "{}",
      updatedAt: Temporal.Now.instant(),
      // history: { create: { toStatus: 'DRAFT', changedById: req.user.id } },
    })
    return reply.status(201).send({ id: created.id })
  })

  app.get<{ Params: { id: string } }>('/cases/:id', async (req) => {
    return serializeCase(await getCaseFor(req.user, req.params.id), req.user)
  })

  // Save answers (autosave / section save). Partial: only the keys sent are replaced.
  app.patch<{ Params: { id: string } }>('/cases/:id', async (req) => {
    const body = z.object({ data: z.record(z.string(), z.unknown()) }).parse(req.body)
    const c = await getCaseFor(req.user, req.params.id)
    assertApplicantCanEdit(req.user, c)
    const def = definitionFor(c)

    const merged = sanitizeData(def, { ...(c.data as Data), ...body.data })
    const issues = validateData(def, merged, 'draft')
    if (issues.length) throw new HttpError(422, 'Some answers are invalid', { issues })

    await db.orm.public.KycCase.where({ id: c.id }).update({
      data: merged as InputJsonValue, ...extractIndexed(def, merged)
    })
    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })

  // Submit (or resubmit after an information request).
  app.post<{ Params: { id: string } }>('/cases/:id/submit', async (req) => {
    const body = z
      .object({
        signatoryName: z.string().trim().min(2).max(200),
        acceptedDeclarations: z.array(z.string()),
      })
      .parse(req.body)
    const c = await getCaseFor(req.user, req.params.id)
    assertApplicantCanEdit(req.user, c)
    const def = definitionFor(c)

    const completeness = computeCompleteness(def, (c.data ?? {}) as Data, c.documents)
    const missingDeclarations = def.declarations
      .filter((d) => !body.acceptedDeclarations.includes(d.key))
      .map((d) => d.key)
    if (!completeness.complete || missingDeclarations.length) {
      throw new HttpError(422, 'The case is not ready to submit', { completeness, missingDeclarations })
    }

    const now = new Date()
    await db.transaction(async (tx) => {
      await Promise.all(
          def.declarations.map((d) =>
              tx.orm.public.DeclarationAcceptance.upsert({
                create: {
                  caseId: c.id,
                  declarationKey: d.key,
                  textSnapshot: d.text,
                  formVersion: def.version,
                  signatoryName: body.signatoryName,
                  ipAddress: req.ip,
                  acceptedAt: Temporal.Now.instant(),
                },
                update: {
                  textSnapshot: d.text,
                  formVersion: def.version,
                  signatoryName: body.signatoryName,
                  ipAddress: req.ip,
                  acceptedAt: Temporal.Now.instant(),
                },
                conflictOn: {
                  caseId: c.id,
                  declarationKey: d.key,
                },
              }),
          ),
      )
      await tx.orm.public.CaseComment.where({caseId: c.id, kind: 'INFO_REQUEST', resolvedAt: null}).update({
        resolvedAt: Temporal.Now.instant()
      });
      await tx.orm.public.KycCase.where({id: c.id}).update({
        status: 'SUBMITTED', submittedAt: c.submittedAt ?? Temporal.Now.instant()
      });
      await tx.orm.public.StatusChange.create({
        caseId: c.id,
        fromStatus: c.status,
        toStatus: 'SUBMITTED',
        changedById: req.user.id,
        reason: c.status === 'INFO_REQUESTED' ? 'Resubmitted with requested information' : null,
      });
    })
    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })
}
