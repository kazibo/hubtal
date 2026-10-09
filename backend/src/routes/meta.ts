import type { FastifyPluginAsync } from 'fastify'
import { db } from '../prisma/db.js';
import { HttpError } from '../errors'
import { getDefinition, listAvailable } from '../forms/registry'

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', { config: { public: true } }, async () => ({ ok: true }))

  // Lets the prototype UI offer a "sign in as" switcher. Disabled in production.
  app.get('/demo-users', { config: { public: true } }, async () => {
    if (process.env.NODE_ENV === 'production') throw new HttpError(404, 'Not found')
    return db.orm.public.User.select('id', 'name', 'email', 'role').orderBy((u) => u.createdAt.asc()).all();
  })

  app.get('/me', async (req) => req.user)

  app.get('/forms', async () => listAvailable())

  app.get<{ Params: { country: string; flow: string } }>('/forms/:country/:flow', async (req) => {
    const { country, flow } = req.params
    if (flow !== 'EOR' && flow !== 'NON_EOR') throw new HttpError(404, 'Unknown flow')
    const def = getDefinition(country.toUpperCase(), flow)
    if (!def) throw new HttpError(404, 'No form for that country and flow')
    return def
  })
}
