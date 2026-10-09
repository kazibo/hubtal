import { isEmpty, isVisible, type FieldDef, type FormDefinition } from '../../../shared/forms'
import type { Data, Problem } from '../types'

interface Props {
  definition: FormDefinition
  data: Data
  /** Reviewer-only: answers worth a second look, keyed by path. */
  flags?: Problem[]
  /** Fields the reviewer asked the applicant to revisit. */
  requestedKeys?: Set<string>
}

function display(field: FieldDef, value: unknown): React.ReactNode {
  if (isEmpty(value)) return <span className="muted">—</span>
  const label = (v: unknown) => field.options?.find((o) => o.value === v)?.label ?? String(v)
  switch (field.type) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'select':
    case 'radio':
      return label(value)
    case 'checkbox-group':
      return (value as string[]).map(label).join(', ')
    case 'textarea':
      return <span className="pre">{String(value)}</span>
    default:
      return String(value)
  }
}

function Rows({
  fields,
  scope,
  basePath,
  flags,
  requestedKeys,
}: {
  fields: FieldDef[]
  scope: Data
  basePath: string
  flags: Map<string, string>
  requestedKeys?: Set<string>
}) {
  return (
    <dl className="summary">
      {fields
        .filter((f) => isVisible(f.showIf, scope))
        .map((f) => {
          const path = basePath ? `${basePath}.${f.key}` : f.key
          const flag = flags.get(path)
          const value = scope[f.key]
          return (
            <div key={path} className={`row${flag ? ' flagged' : ''}${!basePath && requestedKeys?.has(f.key) ? ' requested' : ''}`}>
              <dt>{f.label}</dt>
              <dd>
                {f.type === 'group' ? (
                  Array.isArray(value) && value.length > 0 ? (
                    (value as Data[]).map((item, i) => (
                      <div className="group-item" key={i}>
                        <strong>
                          {f.itemLabel ?? 'Item'} {i + 1}
                        </strong>
                        <Rows
                          fields={f.itemFields ?? []}
                          scope={item}
                          basePath={`${path}.${i}`}
                          flags={flags}
                          requestedKeys={requestedKeys}
                        />
                      </div>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )
                ) : (
                  display(f, value)
                )}
                {flag && <span className="flag">⚑ {flag}</span>}
              </dd>
            </div>
          )
        })}
    </dl>
  )
}

export function CaseSummary({ definition, data, flags = [], requestedKeys }: Props) {
  const flagMap = new Map(flags.map((f) => [f.path, f.message]))
  return (
    <div>
      {definition.sections
        .filter((s) => isVisible(s.showIf, data))
        .map((s) => (
          <section key={s.key} className="summary-section">
            <h3>{s.title}</h3>
            <Rows fields={s.fields} scope={data} basePath="" flags={flagMap} requestedKeys={requestedKeys} />
          </section>
        ))}
    </div>
  )
}
