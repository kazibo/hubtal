import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { ApplicantCasePage } from './pages/ApplicantCasePage'
import { CasesPage } from './pages/CasesPage'
import { NewCasePage } from './pages/NewCasePage'
import { ReviewCasePage } from './pages/ReviewCasePage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'

function Shell() {
  const { user, users, ready, error, switchUser } = useAuth()

  if (!ready) return <p className="muted pad">Loading…</p>
  if (error || !user) {
    return (
      <p className="error pad">
        Could not load demo users{error ? `: ${error}` : ''}. Is the API running and the database seeded?
      </p>
    )
  }
  const isReviewer = user.role === 'REVIEWER'
  const user_id = "applicant"
  // const isReviewer = false

  return (
    <>
      <header className="topbar">
        <strong>KYC Workflow</strong>
        <nav>
          {isReviewer ? (
            <NavLink to="/review">Review queue</NavLink>
          ) : (
            <NavLink to="/cases">My cases</NavLink>
          )}
        </nav>
        <label className="demo-user">
          Demo user
          <select value={user_id} onChange={(e) => switchUser(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.toLowerCase()})
              </option>
            ))}
          </select>
        </label>
      </header>
      {/* key = user id, so every page reloads its data when the demo user changes */}
      <main key={user_id}>
        {isReviewer ? (
          <Routes>
            <Route path="/review" element={<ReviewQueuePage />} />
            <Route path="/review/:id" element={<ReviewCasePage />} />
            <Route path="*" element={<Navigate to="/review" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/new" element={<NewCasePage />} />
            <Route path="/cases/:id" element={<ApplicantCasePage />} />
            <Route path="*" element={<Navigate to="/cases" replace />} />
          </Routes>
        )}
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
