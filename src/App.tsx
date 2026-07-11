import { useState } from 'react'
import './index.css'
import { useAuth } from './hooks/useAuth'
import { useSightingQueue } from './hooks/useSightingQueue'
import { AuthScreen } from './components/AuthScreen'
import { LogSightingForm } from './components/LogSightingForm'
import type { NewSightingInput } from './types/sighting'

function App() {
  const { user, loading, signOut } = useAuth()
  const { queue, syncing, isOnline, add } = useSightingQueue(user?.id ?? null)
  const [logging, setLogging] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)

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

  if (logging) {
    return (
      <LogSightingForm
        onCancel={() => setLogging(false)}
        onSubmit={async (input: NewSightingInput) => {
          await add(input)
          setLogging(false)
          setConfirmation('Sighting logged!')
          setTimeout(() => setConfirmation(null), 3000)
        }}
      />
    )
  }

  const pendingCount = queue.filter((s) => s.status !== 'synced').length

  return (
    <main className="app-shell">
      <h1>🐋 Whale Sightings</h1>
      <p>Signed in as {user.email}</p>

      {confirmation && <p className="confirmation">{confirmation}</p>}

      <button type="button" className="log-cta" onClick={() => setLogging(true)}>
        I saw one
      </button>

      <p className="queue-status">
        {pendingCount > 0
          ? `${pendingCount} sighting${pendingCount === 1 ? '' : 's'} queued${syncing ? ' — syncing…' : ''}`
          : 'All sightings synced'}
        {!isOnline && ' (offline)'}
      </p>

      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}

export default App
