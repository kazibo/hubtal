import type { FieldDef, Option } from '../../../../shared/forms'

/** opt(['WORK', 'Work'], ...) -> Option[] */
export const opt = (...pairs: [string, string][]): Option[] =>
  pairs.map(([value, label]) => ({ value, label }))

export const yesNo = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  type: 'boolean',
  required: true,
  ...extra,
})

/**
 * Identity block shared by every flow/country: this is what reviewers search by,
 * so the key fields carry `index` markers.
 */
export function identityFields(withResidenceCountry = false): FieldDef[] {
  const residenceCountry: FieldDef = {
    key: 'residenceCountry',
    label: 'Country of residence',
    type: 'text',
    required: true,
  }
  return [
    { key: 'fullName', label: 'Full name (as in passport)', type: 'text', required: true, index: 'applicantName' },
    { key: 'nationality', label: 'Nationality', type: 'text', required: true, index: 'nationality' },
    {
      key: 'passportNumber',
      label: 'Passport number',
      type: 'text',
      required: true,
      maxLength: 30,
      index: 'passportNumber',
    },
    { key: 'passportExpiry', label: 'Passport expiry date', type: 'date', required: true },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
    ...(withResidenceCountry ? [residenceCountry] : []),
    { key: 'residenceAddress', label: 'Current residential address', type: 'textarea', required: true },
    { key: 'email', label: 'Email address', type: 'email', required: true, index: 'email' },
    { key: 'phone', label: 'Phone number', type: 'phone', required: true },
  ]
}
