const KEY = 'kyc.userId'

export const getUserId = () => localStorage.getItem(KEY) || 'user_applicant'
export const setUserId = (id: string | null) => {
  if (id) localStorage.setItem(KEY, id)
  else localStorage.removeItem(KEY)
}

export class ApiError extends Error {
    constructor(
    public status: number,
    message: string,
    public body: any,
  ) {
    super(message)
  }
}

interface Options {
  method?: string
  body?: unknown
  form?: FormData
  query?: Record<string, string | undefined>
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const uid = getUserId()
  if (uid) headers['x-user-id'] = uid

  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v) params.set(k, v)
  const qs = params.toString()

  const res = await fetch(`/api${path}${qs ? `?${qs}` : ''}`, { method: opts.method ?? 'GET', headers, body })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) throw new ApiError(res.status, json?.message ?? res.statusText, json)
  return json as T
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong')

/** Downloads need the auth header, so we fetch a blob instead of using a plain link. */
export async function downloadDocument(id: string, fileName: string) {
  const uid = getUserId()
  const res = await fetch(`/api/documents/${id}/download`, { headers: uid ? { 'x-user-id': uid } : {} })
  if (!res.ok) throw new Error('Download failed')
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
