import type { FastifyInstance, FastifyRequest } from 'fastify'
import { HttpError } from './errors'
import {db} from "./prisma/db";

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'APPLICANT' | 'REVIEWER'
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
  interface FastifyContextConfig {
    public?: boolean
  }
}

/**
 * PROTOTYPE AUTH ONLY: the caller names a seeded user in the x-user-id header.
 * Everything downstream (ownership checks, reviewer-only routes) is written against
 * `req.user`, so swapping this hook for real sessions/JWT does not touch the routes.
 */
export function installAuth(app: FastifyInstance) {
  app.decorateRequest('user', undefined as unknown as AuthUser)
  app.addHook('onRequest', async (req) => {
    if (req.routeOptions?.config?.public) return
    const id = req.headers['x-user-id']
    if (typeof id !== 'string' || !id) throw new HttpError(401, 'Missing x-user-id header')
    const user = await db.orm.public.User.where({ id }).first();
    if (!user) throw new HttpError(401, 'Unknown user')
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role }
  })
}

export function requireReviewer(req: FastifyRequest) {
  if (req.user.role !== 'REVIEWER') throw new HttpError(403, 'Reviewers only')
}
