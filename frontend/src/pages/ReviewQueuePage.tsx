import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CASE_STATUSES } from '../../../shared/workflow'
import { api, errorMessage } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import { STATUS_LABELS, flowLabel, fmtDate } from '../format'
import type { CaseListItem } from '../types'

export function ReviewQueuePage() {
  const [cases, setCases] = useState<CaseListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [flow, setFlow] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      api<CaseListItem[]>('/cases', { query: { q, status, flow } })
        .then((rows) => {
          setCases(rows)
          setError(null)
        })
        .catch((e) => setError(errorMessage(e)))
    }, 250)
    return () => clearTimeout(t)
  }, [q, status, flow])

  return (
    <div>
      <h1>Review queue</h1>
      <div className="filters">
        <input
          placeholder="Search name, company, email, passport, KYC-00001…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {CASE_STATUSES.filter((s) => s !== 'DRAFT').map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select value={flow} onChange={(e) => setFlow(e.target.value)}>
          <option value="">EOR and non-EOR</option>
          <option value="EOR">EOR</option>
          <option value="NON_EOR">Non-EOR</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {cases?.length === 0 && <p className="muted">No submitted cases match.</p>}
      {cases && cases.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Flow</th>
              <th>Applicant / company</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/review/${c.id}`}>{c.reference}</Link>
                </td>
                <td>
                  {c.country} · {flowLabel(c.flow)}
                </td>
                <td>
                  {c.applicantName ?? '—'}
                  {c.companyName && <span className="muted"> · {c.companyName}</span>}
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>{c.assigneeName ?? <span className="muted">Unassigned</span>}</td>
                <td>{fmtDate(c.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
