import { useState } from 'react'
import { useSightings } from '../hooks/useSightings'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { MapView } from './MapView'
import { ListView } from './ListView'

interface SightingsExplorerProps {
  tab: 'map' | 'list'
}

// Shares one useSightings() fetch/subscription between Map and List instead
// of each view fetching independently, since on wide screens both are now
// mounted at once (side-by-side) rather than one-at-a-time behind tabs.
export function SightingsExplorer({ tab }: SightingsExplorerProps) {
  const { sightings, loading, error } = useSightings()
  const isSplitView = useMediaQuery('(min-width: 768px)')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  if (isSplitView) {
    return (
      <div className="split-view">
        <div className="split-map">
          <MapView
            sightings={sightings}
            loading={loading}
            error={error}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
        </div>
        <div className="split-list">
          <ListView
            sightings={sightings}
            loading={loading}
            error={error}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
        </div>
      </div>
    )
  }

  return tab === 'map' ? (
    <MapView
      sightings={sightings}
      loading={loading}
      error={error}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
    />
  ) : (
    <ListView
      sightings={sightings}
      loading={loading}
      error={error}
      selectedIds={selectedIds}
      onSelect={setSelectedIds}
    />
  )
}
