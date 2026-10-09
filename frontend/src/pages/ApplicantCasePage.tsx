import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { isVisible } from '../../../shared/forms'
import { ApiError, api, errorMessage } from '../api'
import { useAuth } from '../auth'
import { CaseSummary } from '../components/CaseSummary'
import { DocumentsPanel } from '../components/DocumentsPanel'
import { SectionForm } from '../components/SectionForm'
import { StatusBadge } from '../components/StatusBadge'
import { fieldLabels, flowLabel, fmtDate } from '../format'
import type { CaseDetail, Data } from '../types'

export function ApplicantCasePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [data, setData] = useState<Data>({})
  const [stepKey, setStepKey] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [signatory, setSignatory] = useState(user?.name ?? '')
  const [accepted, setAccepted] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    api<CaseDetail>(`/cases/${id}`)
      .then((detail) => {
        setC(detail)
        setData(detail.data)
        setStepKey(detail.definition.sections[0]?.key ?? 'documents')
      })
      .catch((e) => setLoadError(errorMessage(e)))
  }, [id])

  const def = c?.definition
  const sections = useMemo(() => (def ? def.sections.filter((s) => isVisible(s.showIf, data)) : []), [def, data])
  const steps = useMemo(
    () => [
      ...sections.map((s) => ({ key: s.key, title: s.title })),
      { key: 'documents', title: 'Documents' },
      { key: 'submit', title: 'Review & submit' },
    ],
    [sections],
  )

  if (loadError) return <p className="error">{loadError}</p>
  if (!c || !def) return <p className="muted">Loading…</p>

  const openRequests = c.comments.filter((x) => x.kind === 'INFO_REQUEST' && !x.resolvedAt)
  const requestedKeys = new Set(openRequests.flatMap((r) => r.fieldKeys))
  const labels = fieldLabels(def)

  // ---- Read-only view once the case has been handed to the reviewer ----
  if (!c.permissions.canEdit) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1>{c.reference}</h1>
            <p className="muted">
              {c.country} · {flowLabel(c.flow)} · submitted {fmtDate(c.submittedAt)}
            </p>
          </div>
          <StatusBadge status={c.status} />
        </div>
        {c.status === 'APPROVED' && <p className="banner ok">This case has been approved.</p>}
        {c.status === 'REJECTED' && (
          <p className="banner bad">
            This case was rejected.{' '}
            {c.history.filter((h) => h.toStatus === 'REJECTED').slice(-1)[0]?.reason}
          </p>
        )}
        {(c.status === 'SUBMITTED' || c.status === 'IN_REVIEW') && (
          <p className="banner">Your case is with our review team. We will contact you if we need anything else.</p>
        )}
        <div className="panel">
          <CaseSummary definition={def} data={c.data} />
          <DocumentsPanel detail={c} editable={false} onChange={setC} />
        </div>
      </div>
    )
  }

  // ---- Editable view ----
  const currentIndex = Math.max(0, steps.findIndex((s) => s.key === stepKey))
  const currentSection = sections.find((s) => s.key === stepKey)

  async function saveSection(): Promise<boolean> {
    if (!c || !currentSection) return true
    const payload: Data = {}
    for (const f of currentSection.fields) {
      payload[f.key] = isVisible(f.showIf, data) ? (data[f.key] ?? null) : null
    }
    setSaving(true)
    setErrors({})
    setNotice(null)
    try {
      setC(await api<CaseDetail>(`/cases/${c.id}`, { method: 'PATCH', body: { data: payload } }))
      setNotice('Saved')
      return true
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.body?.issues)) {
        setErrors(Object.fromEntries(e.body.issues.map((i: { path: string; message: string }) => [i.path, i.message])))
      }
      setNotice(errorMessage(e))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function goTo(key: string) {
    if (key === stepKey) return
    if (await saveSection()) {
      setStepKey(key)
      window.scrollTo(0, 0)
    }
  }

  async function submit() {
    if (!c) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      setC(
        await api<CaseDetail>(`/cases/${c.id}/submit`, {
          method: 'POST',
          body: { signatoryName: signatory, acceptedDeclarations: accepted },
        }),
      )
      window.scrollTo(0, 0)
    } catch (e) {
      setSubmitError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const stepMark = (key: string) => {
    if (key === 'submit') return ''
    if (key === 'documents') return c.completeness.missingDocuments.length === 0 ? '✓' : '•'
    const progress = c.completeness.sections.find((s) => s.key === key)
    return progress?.complete ? '✓' : '•'
  }
  const stepRequested = (key: string) =>
    sections.find((s) => s.key === key)?.fields.some((f) => requestedKeys.has(f.key)) ?? false

  const problems = c.completeness.sections.filter((s) => s.missing.length > 0)

  return (
    <div className="case-layout">
      <aside className="stepper">
        <h3>{c.reference}</h3>
        <p className="muted">
          {c.country} · {flowLabel(c.flow)}
        </p>
        <div className="progress" title={`${c.completeness.percent}% complete`}>
          <div style={{ width: `${c.completeness.percent}%` }} />
        </div>
        <p className="muted">{c.completeness.percent}% complete</p>
        <ol>
          {steps.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                className={`step${s.key === stepKey ? ' active' : ''}`}
                onClick={() => void goTo(s.key)}
              >
                <span className={`mark${stepMark(s.key) === '✓' ? ' done' : ''}`}>{stepMark(s.key)}</span>
                {s.title}
                {stepRequested(s.key) && <span className="tag">!</span>}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="panel">
        {openRequests.length > 0 && (
          <div className="banner warn">
            <strong>The reviewer needs more information</strong>
            {openRequests.map((r) => (
              <div key={r.id}>
                <p className="pre">{r.body}</p>
                {r.fieldKeys.length > 0 && (
                  <p className="muted">Fields to check: {r.fieldKeys.map((k) => labels[k] ?? k).join(', ')}</p>
                )}
              </div>
            ))}
            <p className="muted">Update your answers or documents, then resubmit from the last step.</p>
          </div>
        )}

        {currentSection && (
          <SectionForm
            section={currentSection}
            data={data}
            onChange={(key, value) => setData((d) => ({ ...d, [key]: value }))}
            errors={errors}
            requestedKeys={requestedKeys}
          />
        )}

        {stepKey === 'documents' && <DocumentsPanel detail={c} editable onChange={setC} />}

        {stepKey === 'submit' && (
          <div>
            <h2>Review & submit</h2>
            {problems.length > 0 || c.completeness.missingDocuments.length > 0 ? (
              <div className="banner warn">
                <strong>Still to do before you can submit</strong>
                <ul>
                  {problems.map((s) => (
                    <li key={s.key}>
                      <button type="button" className="link" onClick={() => void goTo(s.key)}>
                        {s.title}
                      </button>
                      : {s.missing.length} item{s.missing.length > 1 ? 's' : ''} missing
                    </li>
                  ))}
                  {c.completeness.missingDocuments.length > 0 && (
                    <li>
                      <button type="button" className="link" onClick={() => void goTo('documents')}>
                        Documents
                      </button>
                      : {c.completeness.missingDocuments.map((d) => d.label).join('; ')}
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <p className="banner ok">Everything required is filled in.</p>
            )}

            <CaseSummary definition={def} data={c.data} requestedKeys={requestedKeys} />

            <h3>Declarations</h3>
            {def.declarations.map((d) => (
              <label key={d.key} className="choice declaration">
                <input
                  type="checkbox"
                  checked={accepted.includes(d.key)}
                  onChange={(e) =>
                    setAccepted((a) => (e.target.checked ? [...a, d.key] : a.filter((k) => k !== d.key)))
                  }
                />
                {d.text}
              </label>
            ))}
            <label className="choice">
              <input
                type="checkbox"
                checked={accepted.length === def.declarations.length}
                onChange={(e) => setAccepted(e.target.checked ? def.declarations.map((d) => d.key) : [])}
              />
              <em>Accept all</em>
            </label>

            <div className="field">
              <label htmlFor="signatory">Full name of the person confirming these declarations *</label>
              <input id="signatory" value={signatory} onChange={(e) => setSignatory(e.target.value)} />
            </div>
            {submitError && <p className="error">{submitError}</p>}
            <button
              className="primary"
              disabled={
                submitting ||
                !c.completeness.complete ||
                accepted.length !== def.declarations.length ||
                signatory.trim().length < 2
              }
              onClick={submit}
            >
              {submitting ? 'Submitting…' : c.status === 'INFO_REQUESTED' ? 'Resubmit' : 'Submit for review'}
            </button>
          </div>
        )}

        <div className="actions">
          <button disabled={currentIndex === 0 || saving} onClick={() => void goTo(steps[currentIndex - 1].key)}>
            Back
          </button>
          {currentSection && (
            <button disabled={saving} onClick={() => void saveSection()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          {currentIndex < steps.length - 1 && (
            <button className="primary" disabled={saving} onClick={() => void goTo(steps[currentIndex + 1].key)}>
              {currentSection ? 'Save & continue' : 'Continue'}
            </button>
          )}
          {notice && <span className={notice === 'Saved' ? 'muted' : 'error'}>{notice}</span>}
        </div>
      </section>
    </div>
  )
}
