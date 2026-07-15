import { useState } from 'react'
import './index.css'
import { useAuth } from './hooks/useAuth'
import { useSightingQueue } from './hooks/useSightingQueue'
import { AuthScreen } from './components/AuthScreen'
import { LogSightingForm } from './components/LogSightingForm'
import { MapView } from './components/MapView'
import { ListView } from './components/ListView'
import type { NewSightingInput } from './types/sighting'

type Tab = 'map' | 'list'

function App() {
  const { user, loading, signOut } = useAuth()
  const { queue, syncing, isOnline, add, sync } = useSightingQueue(user?.id ?? null)
  const [tab, setTab] = useState<Tab>('map')
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

  const pendingCount = queue.length
  const erroredSighting = queue.find((s) => s.status === 'error')

  return (
    <div className="app-main">
      <header className="app-header">
        <span className="app-logo" aria-label="Whale Sightings">
          🐋
        </span>

        {pendingCount > 0 && (
          <span className="sync-badge">
            {pendingCount}
            {syncing ? '…' : ''}
            {!isOnline && ' ⚡'}
            {!syncing && (
              <button type="button" className="retry-sync" onClick={sync} aria-label="Retry sync">
                ⟳
              </button>
            )}
          </span>
        )}

        <button
          type="button"
          className="icon-button sign-out"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign out"
        >
          ⎋
        </button>
      </header>

      {confirmation && <p className="toast">{confirmation}</p>}

      {erroredSighting?.lastError && (
        <p className="log-error compact">Sync failed: {erroredSighting.lastError}</p>
      )}

      <div className="app-content">{tab === 'map' ? <MapView /> : <ListView />}</div>

      <nav className="tab-bar">
        <button
          type="button"
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          Map
        </button>
        <button type="button" className="log-cta-tab" onClick={() => setLogging(true)}>
          I saw one
        </button>
        <button
          type="button"
          className={tab === 'list' ? 'active' : ''}
          onClick={() => setTab('list')}
        >
          List
        </button>
      </nav>
    </div>
  )
}

export default App
