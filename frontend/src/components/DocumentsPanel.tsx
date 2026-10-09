import { useState } from 'react'
import { isVisible } from '../../../shared/forms'
import { ApiError, api, downloadDocument, errorMessage } from '../api'
import { fmtSize } from '../format'
import type { CaseDetail } from '../types'

interface Props {
  detail: CaseDetail
  /** Upload/delete allowed (applicant, editable status). */
  editable: boolean
  onChange: (updated: CaseDetail) => void
}

export function DocumentsPanel({ detail, editable, onChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requirements = detail.definition.documents.filter((d) => isVisible(d.showIf, detail.data))

  async function upload(requirementKey: string, file: File) {
    setBusy(requirementKey)
    setError(null)
    try {
      const form = new FormData()
      form.append('requirementKey', requirementKey) // must come before the file
      form.append('file', file)
      onChange(await api<CaseDetail>(`/cases/${detail.id}/documents`, { method: 'POST', form }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  async function remove(docId: string) {
    setError(null)
    try {
      onChange(await api<CaseDetail>(`/cases/${detail.id}/documents/${docId}`, { method: 'DELETE' }))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div>
      <h2>Supporting documents</h2>
      <p className="muted">PDF, JPEG or PNG, up to 10 MB each.</p>
      {error && <p className="error">{error}</p>}
      {requirements.map((r) => {
        const docs = detail.documents.filter((d) => d.requirementKey === r.key)
        return (
          <div key={r.key} className="field">
            <label>
              {r.label}
              {r.required ? <span className="req"> *</span> : <span className="muted"> (optional)</span>}
            </label>
            {docs.length === 0 && <p className="muted">Nothing uploaded yet.</p>}
            <ul className="files">
              {docs.map((d) => (
                <li key={d.id}>
                  <button type="button" className="link" onClick={() => downloadDocument(d.id, d.fileName).catch((e) => setError(errorMessage(e)))}>
                    {d.fileName}
                  </button>
                  <span className="muted"> · {fmtSize(d.sizeBytes)}</span>
                  {editable && (
                    <button type="button" className="link danger" onClick={() => remove(d.id)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {editable && (
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={busy === r.key}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void upload(r.key, file)
                  e.target.value = ''
                }}
              />
            )}
            {busy === r.key && <p className="muted">Uploading…</p>}
          </div>
        )
      })}
    </div>
  )
}
