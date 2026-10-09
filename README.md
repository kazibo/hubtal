# KYC Workflow (Indonesia visa sponsorship prototype)

A small web app that replaces the form/spreadsheet KYC process for Indonesia visa sponsorship. Applicants fill in an EOR or non-EOR case, upload documents and submit; internal reviewers search the queue, add notes, request more information and approve or reject.

Stack: React + Vite (TypeScript), Fastify, Prisma, PostgreSQL.

## Run it

Requires Docker. Consists of 4 containers: database, backend, frontend, backend init (last runs once)

```bash
docker compose up -d
```

Navigate to http://localhost:8080 in browser

Use the **Demo user** switcher in the top bar: *Alex* / *Dana* (applicants) and *Riley* (reviewer). Suggested walkthrough: as Alex start a non-EOR case → fill sections → upload documents → accept declarations and submit; switch to Riley → open the case → start review → request info on a few fields; switch back to Alex → fix the highlighted fields → resubmit; Riley approves.

## Architecture in one picture

```
shared/            form-definition types + visibility rule + status workflow (used by API and UI)
backend/
  prisma/schema.prisma
  src/forms/       definitions per country/flow, registry, validation engine
  src/routes/      cases, review, documents, meta
  src/services/    case loading, access rules, serialisation
frontend/src/      pages + a generic form renderer driven by the definition
```

### Data model: relational core + JSON payload

| Concern | Where it lives | Why |
| --- | --- | --- |
| Identity, ownership, status, assignee, country, flow, form version, timestamps | columns on `KycCase` | filtered, sorted, joined, access-controlled |
| Fields reviewers search by (name, nationality, passport, email, company) | indexed columns on `KycCase`, **copied from the answers on every save** | fast, case-insensitive search without querying JSON |
| Everything else the applicant answered | `KycCase.data` (JSONB), keyed by field key | differs per country/flow, changes over time |
| Notes and information requests | `CaseComment` (`INTERNAL_NOTE` / `INFO_REQUEST` + the field keys requested) | reviewer feedback is first-class and per-field |
| Status changes | `StatusChange` (append-only) | audit trail |
| Uploads | `CaseDocument` (metadata; bytes on disk) keyed by requirement | "is the required document there?" is a simple query |
| What was agreed to | `DeclarationAcceptance` (text snapshot, signatory, time, IP, form version) | consent evidence survives wording changes |

### Form definitions drive everything

A form is plain data (`shared/forms.ts`): sections → fields (type, required, options, `showIf`, `index`, `flagWhen`), required documents, declarations. The API serves it, the UI renders from it, the backend validates and computes completeness from it. Definitions are keyed by `(country, flow, version)`; a case pins its `formVersion` when created.

- **EOR vs non-EOR** are two definitions sharing building blocks (`identityFields()`), not two code paths. One generic renderer handles both.
- **Required vs optional** is a flag on the field. Drafts only check structure (a half-typed email can be saved); submit also checks formats and required answers. Hidden (conditional) fields are neither required nor stored.
- **Completeness** is computed server-side from the saved answers: per-section missing items, missing documents, a percentage. The applicant sees it in the stepper and on the submit step; the reviewer sees it too, and approval is blocked while incomplete.
- **Reviewer flags**: fields can declare `flagWhen` (e.g. "sanctions = Yes", "visa previously refused") so reviewers see risk answers highlighted.

### Adding Singapore (or any country / variant)

1. Create `backend/src/forms/definitions/sg-eor.ts` (reuse `identityFields()`, add country-specific fields, documents and declarations).
2. Register it in `backend/src/forms/registry.ts` (`DEFINITIONS` and `COUNTRY_NAMES`).

No migration, no UI change: the "Start a case" page lists whatever the registry exposes. Changing an existing form means adding `version: 2` next to `version: 1`; cases already in flight keep their version.

### Case lifecycle

`DRAFT → SUBMITTED → IN_REVIEW → APPROVED | REJECTED`, with `INFO_REQUESTED` reachable from `SUBMITTED`/`IN_REVIEW`; the applicant resubmits (→ `SUBMITTED`) and open requests are marked answered. Transitions live in `shared/workflow.ts` and are enforced by the API. The applicant can edit only in `DRAFT` and `INFO_REQUESTED`. Rejecting requires a reason.

## Product decisions and simplifications

- **One adaptive product, two definitions.** The user picks the process once; everything else follows from it.
- **Section-by-section flow** with save on navigation, rather than one long form; submit step shows a full read-only summary and a clickable list of what is missing.
- **Information requests point at fields.** The reviewer ticks the fields; the applicant sees them highlighted and listed in a banner. Internal notes are never visible to applicants.
- **Single-choice instead of tick-boxes** where the paper form's boxes were mutually exclusive (purpose of stay, source of wealth, accommodation, tenure).
- **De-duplicated** questions that appear twice in the EOR paper form (start date, position, work location) and added passport expiry, which any visa check needs.
- **Declarations are explicit, itemised consents** recorded with the signatory's name, not a signature image.
- Employer contact and the candidate are filled in by the same applicant account in an EOR case (the HR contact / Emerhub operator who starts the case).

## What I intentionally did not build

- Real authentication (demo user switcher + `x-user-id` header), roles beyond applicant/reviewer, reviewer assignment UI, notifications/emails.
- Country picker lists / ISO validation for nationality and country fields (free text for now), passport validity rules, duplicate-case detection.
- Identity verification, sanctions/adverse-media screening, background checks.
- Autosave while typing, optimistic locking, file virus scanning, document previews.
- API integration tests and UI tests (unit tests cover the form engine and workflow).

## Possible improvements

- Form definition could be moved to database entirely to allow addition of new forms without any code changes + form builder interface. This could be done differently depending on whether forms for different cases and countries need to share some common sections or not. If they do not need to share fields and blocks, whole form definitions could be stored as for example JSON in single database column. If they need to share some parts, then these parts could be stored in separate entities each as JSON and complete form definitions could reference those entities.
- Automatic checks, for example against company registry
- Real authentication, better secure file storage for passports and other stuff for real world us

## Modularity and ability to add new forms and countries is implemented by:

- Most of the form data is stored in JSON column in database, eliminating the need to change database models for every new form
- Forms are defined as typescript objects, not separate frontend files, so new forms can be added without rewriting front and migrating database, Form definitions can also potentially be easily moved to database (JSON field) to allow addition of new forms without committing changes to code, just by adding new row to database (to do that form builder interface must be implemented, i did not move forms to database because it would make no sense without described interface)

## What I would change before production

- Replace the demo auth with real sessions/SSO, per-organisation tenancy, and an audit of every read of sensitive data.
- Encrypt PII fields (passport number, DOB, income) at rest, move uploads to private object storage with signed URLs and malware scanning, add retention/deletion rules for KYC data.
- Reviewer assignment and SLAs, email notifications, optimistic concurrency on reviewer actions.
- Move form definitions to the database (or a config repo) with an admin UI and a review process, keeping the same versioned model.
- Integrate screening providers behind a queue; store results as separate records.
- Rate limiting, request logging without PII, CI with API integration tests against a real Postgres, proper migrations pipeline, hosted deployment.
- Add tests

## AI tools: how I used them

Claude chat and ChatGPT were used to generate significant part of code and for some consultations. Architecture design is human made. Agents were not used, only chats.