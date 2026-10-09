import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isVisible } from '../../../shared/forms'
import { api, errorMessage } from '../api'
import { CaseSummary } from '../components/CaseSummary'
import { DocumentsPanel } from '../components/DocumentsPanel'
import { StatusBadge } from '../components/StatusBadge'
import { STATUS_LABELS, fieldLabels, flowLabel, fmtDate } from '../format'
import type { CaseDetail } from '../types'

export function ReviewCasePage() {
  const { id } = useParams()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [fieldKeys, setFieldKeys] = useState<string[]>([])

  useEffect(() => {
    api<CaseDetail>(`/cases/${id}`)
      .then(setC)
      .catch((e) => setLoadError(errorMessage(e)))
  }, [id])

  const labels = useMemo(() => (c ? fieldLabels(c.definition) : {}), [c])

  if (loadError) return <p className="error">{loadError}</p>
  if (!c) return <p className="muted">Loading…</p>
  const def = c.definition

  async function act(path: string, body: unknown, after?: () => void) {
    setBusy(true)
    setError(null)
    try {
      setC(await api<CaseDetail>(`/cases/${c!.id}${path}`, { method: 'POST', body }))
      after?.()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const can = (s: string) => c.permissions.transitions.includes(s as never)
  const openRequestKeys = new Set(
    c.comments.filter((x) => x.kind === 'INFO_REQUEST' && !x.resolvedAt).flatMap((x) => x.fieldKeys),
  )

  const timeline = [
    ...c.comments.map((x) => ({ at: x.createdAt, kind: 'comment' as const, comment: x })),
    ...c.history.map((h) => ({ at: h.createdAt, kind: 'status' as const, status: h })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const incompleteCount = c.completeness.sections.reduce((n, s) => n + s.missing.length, 0)

  return (
    <div>
      <p>
        <Link to="/review">← Review queue</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>
            {c.reference} <StatusBadge status={c.status} />
          </h1>
          <p className="muted">
            {c.country} · {flowLabel(c.flow)} · form v{c.formVersion} · submitted {fmtDate(c.submittedAt)} · by{' '}
            {c.owner.name} · assignee {c.assignee?.name ?? 'none'}
          </p>
        </div>
      </div>

      <div className="review-layout">
        <div className="panel">
          {c.flags.length > 0 && (
            <div className="banner warn">
              <strong>Needs attention</strong>
              <ul>
                {c.flags.map((f) => (
                  <li key={f.path}>
                    {f.message} <span className="muted">({f.label})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!c.completeness.complete && (
            <div className="banner bad">
              Incomplete: {incompleteCount} missing/invalid answer{incompleteCount === 1 ? '' : 's'}
              {c.completeness.missingDocuments.length > 0 &&
                ` and ${c.completeness.missingDocuments.length} required document(s) not uploaded`}
              .
            </div>
          )}
          <CaseSummary definition={def} data={c.data} flags={c.flags} requestedKeys={openRequestKeys} />
          <DocumentsPanel detail={c} editable={false} onChange={setC} />
          {c.declarations.length > 0 && (
            <div>
              <h3>Declarations accepted</h3>
              <p className="muted">
                By {c.declarations[0].signatoryName} on {fmtDate(c.declarations[0].acceptedAt)}
              </p>
              <ul>
                {c.declarations.map((d) => (
                  <li key={d.key}>{d.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="panel side">
          {error && <p className="error">{error}</p>}

          <h3>Decision</h3>
          <div className="field">
            <label htmlFor="reason">Reason (required to reject)</label>
            <textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="actions">
            {can('IN_REVIEW') && (
              <button disabled={busy} onClick={() => act('/status', { status: 'IN_REVIEW' })}>
                Start review
              </button>
            )}
            {can('APPROVED') && (
              <button
                className="primary"
                disabled={busy || !c.completeness.complete}
                title={c.completeness.complete ? '' : 'The case is incomplete'}
                onClick={() => act('/status', { status: 'APPROVED', reason: reason || undefined }, () => setReason(''))}
              >
                Approve
              </button>
            )}
            {can('REJECTED') && (
              <button
                className="danger"
                disabled={busy || !reason.trim()}
                onClick={() => act('/status', { status: 'REJECTED', reason }, () => setReason(''))}
              >
                Reject
              </button>
            )}
            {c.permissions.transitions.length === 0 && (
              <span className="muted">No further actions: status is {STATUS_LABELS[c.status]}.</span>
            )}
          </div>

          {can('INFO_REQUESTED') && (
            <>
              <h3>Request information</h3>
              <div className="field">
                <label htmlFor="msg">Message to the applicant</label>
                <textarea id="msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <div className="field">
                <label>Point at specific fields (optional)</label>
                {def.sections
                  .filter((s) => isVisible(s.showIf, c.data))
                  .map((s) => (
                    <details key={s.key}>
                      <summary>
                        {s.title}
                        {s.fields.some((f) => fieldKeys.includes(f.key)) && ' •'}
                      </summary>
                      {s.fields
                        .filter((f) => isVisible(f.showIf, c.data))
                        .map((f) => (
                          <label key={f.key} className="choice">
                            <input
                              type="checkbox"
                              checked={fieldKeys.includes(f.key)}
                              onChange={(e) =>
                                setFieldKeys((k) => (e.target.checked ? [...k, f.key] : k.filter((x) => x !== f.key)))
                              }
                            />
                            {f.label}
                          </label>
                        ))}
                    </details>
                  ))}
                {fieldKeys.length > 0 && (
                  <p className="muted">Selected: {fieldKeys.map((k) => labels[k] ?? k).join(', ')}</p>
                )}
              </div>
              <button
                disabled={busy || !message.trim()}
                onClick={() =>
                  act('/info-requests', { message, fieldKeys }, () => {
                    setMessage('')
                    setFieldKeys([])
                  })
                }
              >
                Send request
              </button>
            </>
          )}

          <h3>Internal note</h3>
          <textarea rows={3} value={note} placeholder="Visible to reviewers only" onChange={(e) => setNote(e.target.value)} />
          <button disabled={busy || !note.trim()} onClick={() => act('/notes', { body: note }, () => setNote(''))}>
            Add note
          </button>

          <h3>Activity</h3>
          <ol className="timeline">
            {timeline.map((t) =>
              t.kind === 'status' ? (
                <li key={t.status.id}>
                  <span className="muted">{fmtDate(t.at)}</span>
                  <div>
                    {t.status.fromStatus ? `${STATUS_LABELS[t.status.fromStatus]} → ` : ''}
                    <strong>{STATUS_LABELS[t.status.toStatus]}</strong> · {t.status.changedBy.name}
                  </div>
                  {t.status.reason && <div className="pre muted">{t.status.reason}</div>}
                </li>
              ) : (
                <li key={t.comment.id} className={t.comment.kind === 'INFO_REQUEST' ? 'request' : 'note'}>
                  <span className="muted">{fmtDate(t.at)}</span>
                  <div>
                    <strong>{t.comment.kind === 'INFO_REQUEST' ? 'Info request' : 'Note'}</strong> · {t.comment.author.name}
                    {t.comment.resolvedAt && <span className="muted"> · answered</span>}
                  </div>
                  <div className="pre">{t.comment.body}</div>
                  {t.comment.fieldKeys.length > 0 && (
                    <div className="muted">Fields: {t.comment.fieldKeys.map((k) => labels[k] ?? k).join(', ')}</div>
                  )}
                </li>
              ),
            )}
          </ol>
        </aside>
      </div>
    </div>
  )
}
