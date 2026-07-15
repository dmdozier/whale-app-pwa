import { useMemo, useState } from 'react'
import { useSpecies } from '../hooks/useSpecies'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversineDistanceMiles } from '../lib/geo'
import { SightingList } from './SightingList'
import type { DisplaySighting } from '../types/sighting'

type SortMode = 'recent' | 'nearest'

interface ListViewProps {
  sightings: DisplaySighting[]
  loading: boolean
  error: string | null
  selectedIds: string[]
  onSelect: (ids: string[]) => void
}

export function ListView({ sightings, loading, error, selectedIds, onSelect }: ListViewProps) {
  const species = useSpecies()
  const { position, requestLocation } = useGeolocation()

  const [sort, setSort] = useState<SortMode>('recent')
  const [speciesFilter, setSpeciesFilter] = useState<number | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  function handleSortChange(mode: SortMode) {
    setSort(mode)
    if (mode === 'nearest' && !position) requestLocation()
  }

  const filtered = useMemo(() => {
    let list = sightings

    if (speciesFilter !== 'all') {
      const name = species.find((s) => s.id === speciesFilter)?.commonName
      list = list.filter((s) => s.speciesName === name)
    }

    if (fromDate) {
      const from = new Date(fromDate).getTime()
      list = list.filter((s) => new Date(s.sightedAt).getTime() >= from)
    }

    if (toDate) {
      const to = new Date(toDate).getTime() + 24 * 60 * 60 * 1000
      list = list.filter((s) => new Date(s.sightedAt).getTime() < to)
    }

    if (sort === 'nearest' && position) {
      list = [...list].sort(
        (a, b) => haversineDistanceMiles(position, a) - haversineDistanceMiles(position, b),
      )
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.sightedAt).getTime() - new Date(a.sightedAt).getTime(),
      )
    }

    return list
  }, [sightings, species, speciesFilter, fromDate, toDate, sort, position])

  return (
    <div className="list-view">
      <div className="list-controls">
        <div className="segmented">
          <button
            type="button"
            className={sort === 'recent' ? 'active' : ''}
            onClick={() => handleSortChange('recent')}
          >
            Most recent
          </button>
          <button
            type="button"
            className={sort === 'nearest' ? 'active' : ''}
            onClick={() => handleSortChange('nearest')}
          >
            Nearest
          </button>
        </div>

        <div className="list-filters">
          <select
            value={speciesFilter}
            onChange={(e) =>
              setSpeciesFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">All species</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.commonName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
          />
        </div>
      </div>

      {error && <p className="log-error">Couldn't refresh from the server: {error}</p>}
      {loading ? (
        <p className="empty-state">Loading sightings…</p>
      ) : (
        <SightingList
          sightings={filtered}
          userLocation={position}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      )}
    </div>
  )
}
