import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api'
import type { FlowType, FormListItem } from '../types'

export function NewCasePage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormListItem[]>([])
  const [country, setCountry] = useState('')
  const [flow, setFlow] = useState<FlowType | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<FormListItem[]>('/forms')
      .then((list) => {
        setForms(list)
        setCountry(list[0]?.country ?? '')
      })
      .catch((e) => setError(errorMessage(e)))
  }, [])

  const countries = useMemo(() => [...new Map(forms.map((f) => [f.country, f.countryName])).entries()], [forms])
  const flows = forms.filter((f) => f.country === country)

  async function create() {
    if (!country || !flow) return
    setBusy(true)
    setError(null)
    try {
      const { id } = await api<{ id: string }>('/cases', { method: 'POST', body: { country, flow } })
      navigate(`/cases/${id}`)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="narrow">
      <h1>Start a KYC case</h1>
      {error && <p className="error">{error}</p>}

      <div className="field">
        <label htmlFor="country">Country</label>
        <select
          id="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            setFlow('')
          }}
        >
          {countries.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Which process applies?</label>
        <div className="cards">
          {flows.map((f) => (
            <label key={f.flow} className={`card-choice${flow === f.flow ? ' selected' : ''}`}>
              <input type="radio" name="flow" checked={flow === f.flow} onChange={() => setFlow(f.flow)} />
              <strong>{f.title}</strong>
              <span className="muted">{f.description}</span>
            </label>
          ))}
        </div>
      </div>

      <button className="primary" disabled={!flow || busy} onClick={create}>
        {busy ? 'Creating…' : 'Continue'}
      </button>
    </div>
  )
}
