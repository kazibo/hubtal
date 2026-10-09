import type { FlowType, FormDefinition } from '../../../shared/forms'
import { idEor } from './definitions/id-eor'
import { idNonEor } from './definitions/id-non-eor'

export const COUNTRY_NAMES: Record<string, string> = {
  ID: 'Indonesia',
  // SG: 'Singapore',
}

/**
 * Adding a country or a new process variant:
 *   1. create backend/src/forms/definitions/<cc>-<flow>.ts (reuse identityFields() etc. from common.ts)
 *   2. add the country to COUNTRY_NAMES and the definition to DEFINITIONS below.
 * No database migration, no UI change.
 *
 * Changing an existing form: add a NEW definition with version + 1 and keep the old one in the list.
 * Existing cases stay pinned to the version they were created with.
 */
const DEFINITIONS: FormDefinition[] = [idNonEor, idEor]

export function getDefinition(country: string, flow: FlowType, version?: number): FormDefinition | undefined {
  const matches = DEFINITIONS.filter((d) => d.country === country && d.flow === flow)
  if (version !== undefined) return matches.find((d) => d.version === version)
  return matches.sort((a, b) => b.version - a.version)[0]
}

export function listAvailable() {
  const latest = new Map<string, FormDefinition>()
  for (const d of DEFINITIONS) {
    const k = `${d.country}:${d.flow}`
    const cur = latest.get(k)
    if (!cur || d.version > cur.version) latest.set(k, d)
  }
  return [...latest.values()].map((d) => ({
    country: d.country,
    countryName: COUNTRY_NAMES[d.country] ?? d.country,
    flow: d.flow,
    title: d.title,
    description: d.description ?? '',
    version: d.version,
  }))
}

export const allDefinitions = (): readonly FormDefinition[] => DEFINITIONS
