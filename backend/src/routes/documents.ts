import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { MultipartValue } from '@fastify/multipart'
import type { FastifyPluginAsync } from 'fastify'
import { isVisible } from '../../../shared/forms'
import { db } from '../prisma/db.js';
import { HttpError } from '../errors'
import type { Data } from '../forms/validation'
import { assertApplicantCanEdit, definitionFor, getCaseFor, serializeCase } from '../services/caseService'

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads')
export const MAX_FILE_BYTES = 10 * 1024 * 1024

// Extension comes from the (allow-listed) MIME type, never from the client's file name.
const ALLOWED: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
}

export const documentRoutes: FastifyPluginAsync = async (app) => {
  await mkdir(UPLOAD_DIR, { recursive: true })

  // multipart/form-data: `requirementKey` must be appended BEFORE `file`.
  app.post<{ Params: { id: string } }>('/cases/:id/documents', async (req) => {
    const c = await getCaseFor(req.user, req.params.id)
    assertApplicantCanEdit(req.user, c)
    const def = definitionFor(c)

    const part = await req.file()
    if (!part) throw new HttpError(400, 'No file uploaded')

    const requirementKey = (part.fields['requirementKey'] as MultipartValue<string> | undefined)?.value
    const requirement = def.documents.find((d) => d.key === requirementKey)
    if (!requirement || !isVisible(requirement.showIf, (c.data ?? {}) as Data)) {
      part.file.resume()
      throw new HttpError(400, 'Unknown document type for this case')
    }
    const ext = ALLOWED[part.mimetype]
    if (!ext) {
      part.file.resume()
      throw new HttpError(415, 'Only PDF, JPEG and PNG files are accepted')
    }

    const storageKey = `${randomUUID()}${ext}`
    const target = path.join(UPLOAD_DIR, storageKey)
    try {
      await pipeline(part.file, createWriteStream(target))
      if (part.file.truncated) throw new HttpError(413, 'File is larger than 10 MB')
    } catch (e) {
      await unlink(target).catch(() => {})
      throw e
    }

    await db.orm.public.CaseDocument.create({
      caseId: c.id,
      requirementKey: requirement.key,
      fileName: path.basename(part.filename).slice(0, 200) || `document${ext}`,
      mimeType: part.mimetype,
      sizeBytes: (await stat(target)).size,
      storageKey,
      uploadedById: req.user.id,
    })
    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })

  app.delete<{ Params: { id: string; docId: string } }>('/cases/:id/documents/:docId', async (req) => {
    const c = await getCaseFor(req.user, req.params.id)
    assertApplicantCanEdit(req.user, c)
    const doc = await db.orm.public.CaseDocument.where( { id: req.params.docId, caseId: c.id } ).first();
    if (!doc) throw new HttpError(404, 'Document not found')
    await db.orm.public.CaseDocument.where({ id: doc.id }).delete()
    await unlink(path.join(UPLOAD_DIR, doc.storageKey)).catch(() => {})
    return serializeCase(await getCaseFor(req.user, c.id), req.user)
  })

  app.get<{ Params: { id: string } }>('/documents/:id/download', async (req, reply) => {
    const doc = await db.orm.public.CaseDocument.where( { id: req.params.id } ).first()
    if (!doc) throw new HttpError(404, 'Document not found')
    // getCaseFor enforces the same visibility rules as the case itself.
    await getCaseFor(req.user, doc.caseId)

    reply
      .header('Content-Type', doc.mimeType)
      .header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`)
      .header('X-Content-Type-Options', 'nosniff')
    return reply.send(createReadStream(path.join(UPLOAD_DIR, doc.storageKey)))
  })
}
