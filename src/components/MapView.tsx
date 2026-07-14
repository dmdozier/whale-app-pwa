import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import { useSightings } from '../hooks/useSightings'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversineDistanceMiles, DRIVE_TIME_OPTIONS } from '../lib/geo'
import { SightingList } from './SightingList'
import type { DisplaySighting } from '../types/sighting'

const DEFAULT_CENTER: [number, number] = [47.6062, -122.3321]
const DEFAULT_ZOOM = 9
// Sightings within this many decimal degrees (~1m) are treated as the same exact spot
// and merged into one marker, since no amount of zooming will ever separate them.
const EXACT_LOCATION_PRECISION = 5

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
    if (position) map.setView([position.latitude, position.longitude], DEFAULT_ZOOM)
  }, [position, map])
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
  const [selectedGroup, setSelectedGroup] = useState<DisplaySighting[] | null>(null)

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
    if (!radiusMiles || !position) return sightings
    return sightings.filter((s) => haversineDistanceMiles(position, s) <= radiusMiles)
  }, [sightings, radiusMiles, position])

  const groups = useMemo(() => groupByExactLocation(filtered), [filtered])

  const center: [number, number] = position
    ? [position.latitude, position.longitude]
    : DEFAULT_CENTER

  return (
    <div className="map-view">
      <div className="map-controls segmented">
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

      {radiusMinutes !== 'all' && !position && (
        <p className="log-error">
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

      {radiusMiles && position && (
        <p className="queue-status">
          Showing {filtered.length} of {sightings.length} sighting
          {sightings.length === 1 ? '' : 's'} within {radiusMiles} mi
        </p>
      )}

      {error && <p className="log-error">Couldn't load sightings: {error}</p>}

      <div className="map-container-wrap">
        <MapContainer center={center} zoom={DEFAULT_ZOOM} className="leaflet-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterOnLocation position={position} />
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
