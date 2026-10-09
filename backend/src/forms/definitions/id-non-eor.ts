import type { FormDefinition } from '../../../../shared/forms'
import { identityFields, opt } from './common'

export const idNonEor: FormDefinition = {
  country: 'ID',
  flow: 'NON_EOR',
  version: 1,
  title: 'Visa sponsorship (non-EOR)',
  description: 'KYC assessment for an individual applying for visa sponsorship in Indonesia.',
  sections: [
    {
      key: 'applicant',
      title: 'Applicant information',
      fields: identityFields(),
    },
    {
      key: 'stay',
      title: 'Purpose and length of stay',
      fields: [
        {
          key: 'purpose',
          label: 'Purpose of stay',
          type: 'radio',
          required: true,
          options: opt(
            ['WORK', 'Work'],
            ['PLEASURE', 'Pleasure'],
            ['RETIREMENT', 'Retirement'],
            ['FAMILY', 'Joint family member'],
            ['RELOCATION', 'Relocation'],
            ['OTHER', 'Other'],
          ),
        },
        {
          key: 'purposeOther',
          label: 'Please specify',
          type: 'text',
          required: true,
          showIf: { field: 'purpose', equals: 'OTHER' },
        },
        {
          key: 'stayLength',
          label: 'Intended length of stay',
          type: 'radio',
          required: true,
          options: opt(
            ['LT_1', 'Less than 1 year'],
            ['Y1_3', '1–3 years'],
            ['Y3_5', '3–5 years'],
            ['GT_5', 'More than 5 years'],
          ),
        },
        {
          key: 'activitiesPlan',
          label: 'Activities in Indonesia',
          helpText: 'Describe your activity plan for the next year in one paragraph.',
          type: 'textarea',
          required: true,
        },
        {
          key: 'dailyRoutine',
          label: 'Daily activity overview',
          helpText:
            'Describe your daily routine in Indonesia. Mention the city or area if you already have one in mind.',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      key: 'wealth',
      title: 'Source of wealth',
      fields: [
        {
          key: 'primarySource',
          label: 'Primary source of wealth',
          type: 'radio',
          required: true,
          options: opt(
            ['EMPLOYMENT', 'Employment'],
            ['BUSINESS', 'Business ownership'],
            ['INVESTMENT', 'Investment'],
            ['INHERITANCE', 'Inheritance'],
            ['OTHER', 'Other'],
          ),
        },
        {
          key: 'primarySourceOther',
          label: 'Please specify',
          type: 'text',
          required: true,
          showIf: { field: 'primarySource', equals: 'OTHER' },
        },
        {
          key: 'employerName',
          label: 'Employer / business name',
          type: 'text',
          required: true,
          showIf: { field: 'primarySource', in: ['EMPLOYMENT', 'BUSINESS'] },
        },
        {
          key: 'position',
          label: 'Position / role',
          type: 'text',
          required: true,
          showIf: { field: 'primarySource', in: ['EMPLOYMENT', 'BUSINESS'] },
        },
        { key: 'fundsCountry', label: 'Country of origin of funds', type: 'text', required: true },
        {
          key: 'incomeRange',
          label: 'Estimated yearly income range',
          type: 'select',
          required: true,
          options: opt(
            ['LT_25K', 'Under USD 25,000'],
            ['K25_50', 'USD 25,000–50,000'],
            ['K50_100', 'USD 50,000–100,000'],
            ['K100_250', 'USD 100,000–250,000'],
            ['GT_250K', 'Over USD 250,000'],
          ),
        },
        {
          key: 'receiveMethod',
          label: 'Method of receiving funds',
          type: 'radio',
          required: true,
          options: opt(
            ['BANK_TRANSFER', 'Bank transfer'],
            ['DIVIDEND', 'Dividend'],
            ['THIRD_PARTY', 'Third-party transfer'],
            ['OTHER', 'Other'],
          ),
          flagWhen: 'THIRD_PARTY',
          flagReason: 'Funds received via third party',
        },
        {
          key: 'receiveMethodOther',
          label: 'Please specify',
          type: 'text',
          required: true,
          showIf: { field: 'receiveMethod', equals: 'OTHER' },
        },
      ],
    },
    {
      key: 'address',
      title: 'Address in Indonesia',
      fields: [
        { key: 'residentialAddress', label: 'Residential address in Indonesia', type: 'textarea', required: true },
        {
          key: 'accommodationType',
          label: 'Type of accommodation',
          type: 'radio',
          required: true,
          options: opt(
            ['LANDED_HOUSE', 'Landed house'],
            ['APARTMENT', 'Apartment'],
            ['CONDO', 'Condo'],
            ['HOTEL', 'Hotel'],
          ),
        },
        {
          key: 'rentTenure',
          label: 'Tenure of rent',
          type: 'radio',
          required: true,
          options: opt(['DAILY', 'Daily'], ['MONTHLY', 'Monthly'], ['YEARLY', 'Yearly']),
        },
      ],
    },
  ],
  documents: [
    { key: 'passport_copy', label: 'Passport copy (photo page)', required: true },
    { key: 'proof_of_funds', label: 'Proof of funds (e.g. bank statements, payslips)', required: true },
    { key: 'accommodation_proof', label: 'Lease agreement or booking confirmation', required: true },
  ],
  declarations: [
    {
      key: 'truthful',
      text: 'All information and documents I provided for this KYC assessment and visa sponsorship process are true, accurate and complete to the best of my knowledge.',
    },
    {
      key: 'no_criminal',
      text: 'I am not involved in any criminal activity and have not been convicted of any criminal offense in any jurisdiction.',
    },
    {
      key: 'no_investigation',
      text: 'I am not currently subject to any investigation, legal proceedings or regulatory sanctions.',
    },
    {
      key: 'no_sanctions',
      text: 'I am not listed on any international sanctions or watchlists, including those issued by governmental or international authorities.',
    },
    {
      key: 'lawful_funds',
      text: 'The source of my wealth and funds is lawful and legitimate, and not derived from any illegal activity, including fraud, corruption or money laundering.',
    },
    {
      key: 'lawful_activities',
      text: 'My intended activities in Indonesia are lawful and consistent with the purpose of the visa being applied for.',
    },
    {
      key: 'comply_laws',
      text: 'I agree to comply with all applicable laws and regulations in Indonesia, including immigration and tax requirements.',
    },
    {
      key: 'verification_rights',
      text: 'I understand that the Company may verify any information I provided and may request additional documents.',
    },
    {
      key: 'false_info',
      text: 'I acknowledge that false, misleading or incomplete information may result in rejection of my application or termination of services without liability to the Company.',
    },
    {
      key: 'background_checks',
      text: 'I consent to the Company conducting background checks, including identity verification, sanctions screening and other due diligence it deems necessary.',
    },
  ],
}
