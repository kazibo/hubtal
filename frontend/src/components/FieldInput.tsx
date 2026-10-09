import { isVisible, type FieldDef } from '../../../shared/forms'
import type { Data } from '../types'

interface Props {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  /** Dotted path used to look up server-side errors, e.g. "ubos.0.fullName". */
  path: string
  errors: Record<string, string>
  /** A reviewer asked the applicant to revisit this field. */
  requested?: boolean
  disabled?: boolean
}

export function FieldInput({ field, value, onChange, path, errors, requested, disabled }: Props) {
  const error = errors[path]
  const id = `f-${path}`
  const str = typeof value === 'string' ? value : ''

  let control: React.ReactNode
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      control = (
        <input
          id={id}
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          value={str}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case 'date':
      control = <input id={id} type="date" value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      break
    case 'number':
      control = (
        <input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          value={typeof value === 'number' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )
      break
    case 'textarea':
      control = <textarea id={id} rows={4} value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      break
    case 'select':
      control = (
        <select id={id} value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
      break
    case 'radio':
      control = (
        <div className="choices">
          {field.options?.map((o) => (
            <label key={o.value} className="choice">
              <input
                type="radio"
                name={id}
                checked={value === o.value}
                disabled={disabled}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )
      break
    case 'boolean':
      control = (
        <div className="choices">
          {[
            [true, 'Yes'],
            [false, 'No'],
          ].map(([v, label]) => (
            <label key={String(label)} className="choice">
              <input type="radio" name={id} checked={value === v} disabled={disabled} onChange={() => onChange(v)} />
              {label as string}
            </label>
          ))}
        </div>
      )
      break
    case 'checkbox-group': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      control = (
        <div className="choices">
          {field.options?.map((o) => (
            <label key={o.value} className="choice">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                disabled={disabled}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      )
      break
    }
    case 'group': {
      const items = Array.isArray(value) ? (value as Data[]) : []
      const itemLabel = field.itemLabel ?? 'Item'
      const update = (i: number, key: string, v: unknown) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)))
      control = (
        <div className="group">
          {items.map((item, i) => (
            <div className="group-item" key={i}>
              <div className="group-head">
                <strong>
                  {itemLabel} {i + 1}
                </strong>
                {!disabled && (
                  <button type="button" className="link danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                    Remove
                  </button>
                )}
              </div>
              {field.itemFields
                ?.filter((f) => isVisible(f.showIf, item))
                .map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={item[f.key]}
                    onChange={(v) => update(i, f.key, v)}
                    path={`${path}.${i}.${f.key}`}
                    errors={errors}
                    disabled={disabled}
                  />
                ))}
            </div>
          ))}
          {!disabled && (
            <button type="button" onClick={() => onChange([...items, {}])}>
              + Add {itemLabel.toLowerCase()}
            </button>
          )}
        </div>
      )
      break
    }
  }

  return (
    <div className={`field${requested ? ' requested' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && <span className="req"> *</span>}
        {requested && <span className="tag">Reviewer asked you to check this</span>}
      </label>
      {field.helpText && <p className="help">{field.helpText}</p>}
      {control}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
