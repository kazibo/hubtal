import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import { flowLabel, fmtDate } from '../format'
import type { CaseListItem } from '../types'

export function CasesPage() {
  const [cases, setCases] = useState<CaseListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<CaseListItem[]>('/cases')
      .then(setCases)
      .catch((e) => setError(errorMessage(e)))
  }, [])

  return (
    <div>
      <div className="page-head">
        <h1>My KYC cases</h1>
        <Link to="/cases/new" className="button primary">
          Start a new case
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {!cases && !error && <p className="muted">Loading…</p>}
      {cases?.length === 0 && <p className="muted">No cases yet. Start one to begin the KYC process.</p>}
      {cases && cases.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Flow</th>
              <th>Name</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/cases/${c.id}`}>{c.reference}</Link>
                </td>
                <td>
                  {c.country} · {flowLabel(c.flow)}
                </td>
                <td>{c.applicantName ?? c.companyName ?? <span className="muted">Not filled in yet</span>}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>{fmtDate(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
