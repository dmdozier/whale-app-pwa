import { haversineDistanceMiles } from '../lib/geo'
import { SightingListItem } from './SightingListItem'
import type { DisplaySighting } from '../types/sighting'
import type { LatLng } from '../lib/geo'

interface SightingListProps {
  sightings: DisplaySighting[]
  userLocation?: LatLng | null
}

export function SightingList({ sightings, userLocation }: SightingListProps) {
  if (sightings.length === 0) {
    return <p className="empty-state">No sightings here yet.</p>
  }

  return (
    <ul className="sighting-list">
      {sightings.map((sighting) => (
        <SightingListItem
          key={sighting.id}
          sighting={sighting}
          distanceMiles={
            userLocation ? haversineDistanceMiles(userLocation, sighting) : undefined
          }
        />
      ))}
    </ul>
  )
}
