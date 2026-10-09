import type { FormDefinition } from '../../../../shared/forms'
import { identityFields, opt, yesNo } from './common'

export const idEor: FormDefinition = {
  country: 'ID',
  flow: 'EOR',
  version: 1,
  title: 'Employer of Record (EOR) onboarding',
  description:
    'KYC and due diligence for a foreign employer and the employee it hires in Indonesia through an Employer of Record.',
  sections: [
    {
      key: 'employer',
      title: 'Foreign employer',
      fields: [
        { key: 'companyName', label: 'Registered company name', type: 'text', required: true, index: 'companyName' },
        { key: 'tradingName', label: 'Trading name (if different)', type: 'text' },
        { key: 'registrationNumber', label: 'Registration number', type: 'text', required: true },
        { key: 'incorporationCountry', label: 'Country of incorporation', type: 'text', required: true },
        { key: 'incorporationDate', label: 'Date of incorporation', type: 'date', required: true },
        { key: 'registeredAddress', label: 'Registered business address', type: 'textarea', required: true },
        { key: 'website', label: 'Company website', type: 'text' },
        { key: 'businessNature', label: 'Nature of business', type: 'textarea', required: true },
        { key: 'employeeCount', label: 'Number of employees', type: 'number', required: true, min: 1 },
        { key: 'contactName', label: 'Contact person', type: 'text', required: true },
        { key: 'contactPosition', label: 'Position', type: 'text', required: true },
        { key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
        { key: 'contactPhone', label: 'Contact telephone', type: 'phone', required: true },
      ],
    },
    {
      key: 'ownership',
      title: 'Corporate ownership',
      description: 'List each ultimate beneficial owner (UBO).',
      fields: [
        {
          key: 'ubos',
          label: 'Ultimate beneficial owners',
          type: 'group',
          required: true,
          minItems: 1,
          itemLabel: 'Beneficial owner',
          itemFields: [
            { key: 'fullName', label: 'Full name', type: 'text', required: true },
            { key: 'nationality', label: 'Nationality', type: 'text', required: true },
            { key: 'residenceCountry', label: 'Country of residence', type: 'text', required: true },
            {
              key: 'ownershipPercent',
              label: 'Ownership percentage',
              type: 'number',
              required: true,
              min: 0,
              max: 100,
            },
            {
              key: 'controlTypes',
              label: 'Nature of control',
              type: 'checkbox-group',
              required: true,
              options: opt(
                ['DIRECT_SHAREHOLDER', 'Direct shareholder'],
                ['INDIRECT_SHAREHOLDER', 'Indirect shareholder'],
                ['VOTING_RIGHTS', 'Voting rights'],
                ['OTHER', 'Other'],
              ),
            },
          ],
        },
      ],
    },
    {
      key: 'relationship',
      title: 'Business relationship',
      fields: [
        {
          key: 'eorReason',
          label: 'Why is the company engaging EOR services?',
          type: 'radio',
          required: true,
          options: opt(
            ['HIRE_IN_ID', 'Hiring an employee in Indonesia'],
            ['MARKET_EXPANSION', 'Market expansion'],
            ['PROJECT_BASED', 'Project-based assignment'],
            ['REMOTE_WORKFORCE', 'Remote workforce'],
            ['BUSINESS_DEV', 'Business development'],
            ['OTHER', 'Other'],
          ),
        },
        {
          key: 'eorReasonExplain',
          label: 'Please explain',
          type: 'textarea',
          required: true,
          showIf: { field: 'eorReason', equals: 'OTHER' },
        },
      ],
    },
    {
      key: 'engagement',
      title: 'Employee engagement',
      fields: [
        { key: 'startDate', label: 'Expected start date', type: 'date', required: true },
        { key: 'position', label: 'Position', type: 'text', required: true },
        { key: 'reportingManager', label: 'Reporting manager name', type: 'text', required: true },
        { key: 'workLocation', label: 'Work location (city / area)', type: 'text', required: true },
        { key: 'employmentPeriod', label: 'Expected employment period', type: 'text', required: true },
        {
          key: 'workArrangement',
          label: 'Work arrangement',
          type: 'radio',
          required: true,
          options: opt(['ON_SITE', 'On-site'], ['HYBRID', 'Hybrid'], ['REMOTE', 'Remote']),
        },
      ],
    },
    {
      key: 'compliance',
      title: 'Company compliance questionnaire',
      fields: [
        yesNo('companyIncorporated', 'Is the company legally incorporated in its jurisdiction?', {
          flagWhen: false,
          flagReason: 'Company reports it is not legally incorporated',
        }),
        yesNo('bankruptcy', 'Has the company ever been declared bankrupt or insolvent?', {
          flagWhen: true,
          flagReason: 'Bankruptcy / insolvency history',
        }),
        yesNo('litigation', 'Is the company involved in litigation that may materially affect its business?', {
          flagWhen: true,
          flagReason: 'Material litigation',
        }),
        yesNo('sanctions', 'Is the company subject to any government sanctions or regulatory restrictions?', {
          flagWhen: true,
          flagReason: 'Sanctions / regulatory restrictions',
        }),
        yesNo('prohibitedActivities', 'Is the company engaged in any prohibited or illegal activities?', {
          flagWhen: true,
          flagReason: 'Prohibited or illegal activities',
        }),
      ],
    },
    {
      key: 'candidate',
      title: 'Employee (candidate) information',
      fields: identityFields(true),
    },
    {
      key: 'background',
      title: 'Employment background',
      fields: [
        {
          key: 'experienceBand',
          label: 'Years of professional experience',
          type: 'radio',
          required: true,
          options: opt(['LT5', 'Less than 5 years'], ['Y5_10', '5–10 years'], ['GT10', 'More than 10 years']),
        },
        { key: 'latestJobPosition', label: 'Latest job position', type: 'text', required: true },
        { key: 'hasCertification', label: 'Do you hold a relevant certification / expertise?', type: 'boolean', required: true },
      ],
    },
    {
      key: 'immigration',
      title: 'Immigration history',
      fields: [
        { key: 'currentImmigrationStatus', label: 'Current immigration status', type: 'text', required: true },
        yesNo('workedInIndonesia', 'Have you previously worked in Indonesia?'),
        yesNo('heldKitas', 'Have you ever held an Indonesian KITAS or work permit?'),
        yesNo('visaRefused', 'Have you ever been refused an Indonesian visa or work permit?', {
          flagWhen: true,
          flagReason: 'Previous visa / permit refusal',
        }),
        yesNo('deportedOrOverstayed', 'Have you ever been deported or overstayed in Indonesia or another country?', {
          flagWhen: true,
          flagReason: 'Deportation or overstay history',
        }),
        {
          key: 'immigrationDetails',
          label: 'Please provide details',
          type: 'textarea',
          required: true,
          showIf: {
            any: [
              { field: 'workedInIndonesia', equals: true },
              { field: 'heldKitas', equals: true },
              { field: 'visaRefused', equals: true },
              { field: 'deportedOrOverstayed', equals: true },
            ],
          },
        },
      ],
    },
  ],
  documents: [
    { key: 'company_registration', label: 'Company registration certificate', required: true },
    { key: 'ubo_identification', label: 'Identification documents of beneficial owners', required: false },
    { key: 'candidate_passport', label: "Employee's passport copy (photo page)", required: true },
    {
      key: 'certification_proof',
      label: 'Certification / proof of expertise',
      required: true,
      showIf: { field: 'hasCertification', equals: true },
    },
  ],
  declarations: [
    { key: 'truthful', text: 'All information and documents provided are true, accurate and complete.' },
    { key: 'established', text: 'The Company is legally established and authorized to conduct its business.' },
    {
      key: 'no_unlawful',
      text: 'Neither the Company nor its Ultimate Beneficial Owners are engaged in unlawful activities, including fraud, bribery, corruption, terrorist financing, money laundering, human trafficking or sanctions evasion.',
    },
    {
      key: 'comply_laws',
      text: 'The Company agrees to comply with all applicable employment, immigration, tax, anti-money laundering (AML), anti-bribery, sanctions and data protection laws applicable to the Employer of Record engagement.',
    },
    {
      key: 'authorize_checks',
      text: 'The Company authorizes the Employer of Record to conduct corporate verification, UBO verification, sanctions screening, adverse media screening and any other due diligence deemed necessary.',
    },
    {
      key: 'right_to_decline',
      text: 'The Company understands that the Employer of Record may decline or terminate the engagement if any material compliance risk is identified.',
    },
    {
      key: 'data_consent',
      text: 'The Company consents to the collection, processing and storage of company and candidate personal data for employment, immigration and compliance purposes in accordance with applicable data protection laws.',
    },
  ],
}
