import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import { useSightings } from '../hooks/useSightings'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversineDistanceMiles, boundingBoxForRadius, DRIVE_TIME_OPTIONS } from '../lib/geo'
import { SightingList } from './SightingList'
import type { DisplaySighting } from '../types/sighting'

const DEFAULT_CENTER: [number, number] = [47.6062, -122.3321]
const DEFAULT_ZOOM = 9
// Sightings within this many decimal degrees (~1m) are treated as the same exact spot
// and merged into one marker, since no amount of zooming will ever separate them.
const EXACT_LOCATION_PRECISION = 5

const RECENCY_OPTIONS = [
  { label: 'Last Hour', hours: 1 },
  { label: 'Last Day', hours: 24 },
  { label: 'Last Week', hours: 24 * 7 },
  { label: 'Last Month', hours: 24 * 30 },
]

function exactLocationKey(s: DisplaySighting): string {
  return `${s.latitude.toFixed(EXACT_LOCATION_PRECISION)}_${s.longitude.toFixed(EXACT_LOCATION_PRECISION)}`
}

function groupByExactLocation(sightings: DisplaySighting[]): DisplaySighting[][] {
  const byKey = new Map<string, DisplaySighting[]>()
  for (const s of sightings) {
    const key = exactLocationKey(s)
    const arr = byKey.get(key) ?? []
    arr.push(s)
    byKey.set(key, arr)
  }
  return Array.from(byKey.values())
}

function makeDivIcon(count: number) {
  return L.divIcon({
    className: 'sighting-marker',
    html: `<div class="sighting-marker-badge${count > 1 ? ' multi' : ''}">${count > 1 ? count : ''}</div>`,
    iconSize: count > 1 ? [30, 30] : [18, 18],
  })
}

function RecenterOnLocation({ position }: { position: { latitude: number; longitude: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], DEFAULT_ZOOM, { animate: false })
    }
  }, [position, map])
  return null
}

function FitRadiusBounds({
  position,
  radiusMiles,
}: {
  position: { latitude: number; longitude: number } | null
  radiusMiles: number | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!position || !radiusMiles) return
    const bounds = boundingBoxForRadius(position, radiusMiles)
    map.fitBounds(bounds, { padding: [12, 12], animate: false })
  }, [position, radiusMiles, map])
  return null
}

export function MapView() {
  const { sightings, loading, error } = useSightings()
  const {
    position,
    loading: locating,
    error: locationError,
    requestLocation,
  } = useGeolocation()
  const [radiusMinutes, setRadiusMinutes] = useState<number | 'all'>('all')
  const [recencyHours, setRecencyHours] = useState<number | 'all'>('all')
  const [selectedGroup, setSelectedGroup] = useState<DisplaySighting[] | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  function selectRadius(minutes: number | 'all') {
    setRadiusMinutes(minutes)
    if (minutes !== 'all' && !position) requestLocation()
  }

  const radiusMiles =
    radiusMinutes === 'all'
      ? null
      : (DRIVE_TIME_OPTIONS.find((o) => o.minutes === radiusMinutes)?.radiusMiles ?? null)

  const filtered = useMemo(() => {
    let result = sightings

    if (recencyHours !== 'all') {
      const cutoffMs = Date.now() - recencyHours * 60 * 60 * 1000
      result = result.filter((s) => new Date(s.sightedAt).getTime() >= cutoffMs)
    }

    if (radiusMiles && position) {
      result = result.filter((s) => haversineDistanceMiles(position, s) <= radiusMiles)
    }

    return result
  }, [sightings, recencyHours, radiusMiles, position])

  const groups = useMemo(() => groupByExactLocation(filtered), [filtered])

  const center: [number, number] = position
    ? [position.latitude, position.longitude]
    : DEFAULT_CENTER

  const recencySummary =
    recencyHours === 'all'
      ? 'All time'
      : (RECENCY_OPTIONS.find((o) => o.hours === recencyHours)?.label ?? 'All time')
  const distanceSummary =
    radiusMinutes === 'all'
      ? 'All distances'
      : (DRIVE_TIME_OPTIONS.find((o) => o.minutes === radiusMinutes)?.label ?? 'All distances')
  const filtersActive = recencyHours !== 'all' || radiusMinutes !== 'all'

  return (
    <div className="map-view">
      <button
        type="button"
        className={`filter-toggle${filtersActive ? ' active' : ''}`}
        onClick={() => setFiltersOpen((open) => !open)}
      >
        <span>
          {recencySummary} · {distanceSummary}
        </span>
        <span className="filter-toggle-chevron">{filtersOpen ? '▴' : '▾'}</span>
      </button>

      {filtersOpen && (
        <>
          <button
            type="button"
            className="filter-backdrop"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="filter-panel">
            <div className="map-filter-group">
              <span className="map-filter-label">When sighted</span>
              <div className="segmented">
                <button
                  type="button"
                  className={recencyHours === 'all' ? 'active' : ''}
                  onClick={() => setRecencyHours('all')}
                >
                  All Time
                </button>
                {RECENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    className={recencyHours === opt.hours ? 'active' : ''}
                    onClick={() => setRecencyHours(opt.hours)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="map-filter-group secondary">
              <span className="map-filter-label">Drive-time distance from you</span>
              <div className="segmented">
                <button
                  type="button"
                  className={radiusMinutes === 'all' ? 'active' : ''}
                  onClick={() => selectRadius('all')}
                >
                  All
                </button>
                {DRIVE_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.minutes}
                    type="button"
                    className={radiusMinutes === opt.minutes ? 'active' : ''}
                    onClick={() => selectRadius(opt.minutes)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {radiusMinutes !== 'all' && !position && (
              <p className="log-error compact">
                {locating
                  ? 'Getting your location…'
                  : locationError
                    ? `Can't filter by distance: ${locationError}`
                    : "Can't filter by distance without your location."}{' '}
                {!locating && (
                  <button type="button" onClick={requestLocation}>
                    Retry
                  </button>
                )}
              </p>
            )}

            {(recencyHours !== 'all' || (radiusMiles && position)) && (
              <p className="filter-count">
                Showing {filtered.length} of {sightings.length} sighting
                {sightings.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </>
      )}

      {error && <p className="log-error compact">Couldn't load sightings: {error}</p>}

      <div className="map-container-wrap">
        <MapContainer center={center} zoom={DEFAULT_ZOOM} className="leaflet-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterOnLocation position={position} />
          <FitRadiusBounds position={position} radiusMiles={radiusMiles} />
          {radiusMiles && position && (
            <Circle
              center={[position.latitude, position.longitude]}
              radius={radiusMiles * 1609.34}
              pathOptions={{ color: '#0a6e8f', fillOpacity: 0.05 }}
            />
          )}
          <MarkerClusterGroup showCoverageOnHover={false} spiderfyOnMaxZoom>
            {groups.map((group) => {
              const lat = group[0].latitude
              const lng = group[0].longitude
              return (
                <Marker
                  key={group[0].id}
                  position={[lat, lng]}
                  icon={makeDivIcon(group.length)}
                  eventHandlers={{ click: () => setSelectedGroup(group) }}
                />
              )
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {loading && <p className="empty-state">Loading sightings…</p>}

      {selectedGroup && (
        <div className="drill-down">
          <div className="drill-down-header">
            <span>
              {selectedGroup.length} sighting{selectedGroup.length === 1 ? '' : 's'}
            </span>
            <button type="button" onClick={() => setSelectedGroup(null)}>
              Close
            </button>
          </div>
          <SightingList sightings={selectedGroup} userLocation={position} />
        </div>
      )}
    </div>
  )
}
