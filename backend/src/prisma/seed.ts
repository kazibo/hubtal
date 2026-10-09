import 'temporal-polyfill/full/global';
import { db } from './db';

// Demo users. The prototype has no real authentication: the frontend picks one of
// these and sends its id in the x-user-id header. See README "Before production".
const users = [
  { id: 'user_applicant', email: 'alex@example.com', name: 'Alex Applicant', role: 'APPLICANT' as const },
  { id: 'user_employer', email: 'dana@example.com', name: 'Dana (Employer contact)', role: 'APPLICANT' as const },
  { id: 'user_reviewer', email: 'riley@example.com', name: 'Riley Reviewer', role: 'REVIEWER' as const },
]

async function main() {
  for (const u of users) {
    await db.orm.public.User.upsert({ conflictOn: { id: u.id }, update: u, create: u })
  }
  console.log(`Seeded ${users.length} users`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }).finally(() => process.exit(0));
