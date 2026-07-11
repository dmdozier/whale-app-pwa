import './index.css'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <main className="app-shell">
        <p>Loading…</p>
      </main>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <main className="app-shell">
      <h1>🐋 Whale Sightings</h1>
      <p>Signed in as {user.email}</p>
      <p>Log, map, and list views come next.</p>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}

export default App
