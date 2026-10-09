import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { installAuth } from './auth'
import { HttpError } from './errors'
import { caseRoutes } from './routes/cases'
import { documentRoutes, MAX_FILE_BYTES } from './routes/documents'
import { metaRoutes } from './routes/meta'
import { reviewRoutes } from './routes/review'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })
  await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 5 } })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.status).send({ message: err.message, ...err.details })
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({
        message: 'Invalid request',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500
    if (status >= 500) req.log.error(err)
    return reply.status(status).send({
      message: status >= 500 ? 'Internal server error' : (err as Error).message,
    })
  })

  installAuth(app)

  await app.register(metaRoutes, { prefix: '/api' })
  await app.register(caseRoutes, { prefix: '/api' })
  await app.register(reviewRoutes, { prefix: '/api' })
  await app.register(documentRoutes, { prefix: '/api' })

  return app
}
