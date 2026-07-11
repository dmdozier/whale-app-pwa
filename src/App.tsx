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
  const { queue, syncing, isOnline, add } = useSightingQueue(user?.id ?? null)
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

  const pendingCount = queue.filter((s) => s.status !== 'synced').length

  return (
    <div className="app-main">
      <header className="app-header">
        <h1>🐋 Whale Sightings</h1>
        <button type="button" className="sign-out" onClick={signOut}>
          Sign out
        </button>
      </header>

      {confirmation && <p className="confirmation">{confirmation}</p>}

      <p className="queue-status">
        {pendingCount > 0
          ? `${pendingCount} sighting${pendingCount === 1 ? '' : 's'} queued${syncing ? ' — syncing…' : ''}`
          : 'All sightings synced'}
        {!isOnline && ' (offline)'}
      </p>

      <div className="app-content">{tab === 'map' ? <MapView /> : <ListView />}</div>

      <nav className="tab-bar">
        <button
          type="button"
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          Map
        </button>
        <button
          type="button"
          className="log-cta-tab"
          onClick={() => setLogging(true)}
        >
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
