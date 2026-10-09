import { isVisible, type SectionDef } from '../../../shared/forms'
import type { Data } from '../types'
import { FieldInput } from './FieldInput'

interface Props {
  section: SectionDef
  data: Data
  onChange: (key: string, value: unknown) => void
  errors: Record<string, string>
  requestedKeys: Set<string>
  disabled?: boolean
}

export function SectionForm({ section, data, onChange, errors, requestedKeys, disabled }: Props) {
  return (
    <div>
      <h2>{section.title}</h2>
      {section.description && <p className="muted">{section.description}</p>}
      {section.fields
        .filter((f) => isVisible(f.showIf, data))
        .map((f) => (
          <FieldInput
            key={f.key}
            field={f}
            value={data[f.key]}
            onChange={(v) => onChange(f.key, v)}
            path={f.key}
            errors={errors}
            requested={requestedKeys.has(f.key)}
            disabled={disabled}
          />
        ))}
    </div>
  )
}
