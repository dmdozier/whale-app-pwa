import { useState } from 'react'
import { formatRelativeTime } from '../lib/format'
import { PhotoViewer } from './PhotoViewer'
import type { DisplaySighting } from '../types/sighting'

interface SightingListItemProps {
  sighting: DisplaySighting
  distanceMiles?: number
  isSelected?: boolean
  onSelect?: () => void
}

export function SightingListItem({
  sighting,
  distanceMiles,
  isSelected,
  onSelect,
}: SightingListItemProps) {
  const [showPhoto, setShowPhoto] = useState(false)

  return (
    <li
      className={`sighting-item${isSelected ? ' selected' : ''}${onSelect ? ' clickable' : ''}`}
      onClick={onSelect}
    >
      {sighting.photoUrl && (
        <button
          type="button"
          className="sighting-thumb"
          onClick={(e) => {
            e.stopPropagation()
            setShowPhoto(true)
          }}
          aria-label="View photo"
        >
          <img src={sighting.photoUrl} alt="" />
        </button>
      )}

      <div className="sighting-details">
        <div className="sighting-headline">
          <strong>{sighting.speciesName ?? 'Unknown species'}</strong>
          {sighting.isPending && <span className="pending-badge">syncing</span>}
        </div>
        <p className="sighting-meta">
          {formatRelativeTime(sighting.sightedAt)} · {sighting.locationType} ·{' '}
          {sighting.distanceEstimate}
          {distanceMiles !== undefined && ` · ${distanceMiles.toFixed(1)} mi away`}
        </p>
        {sighting.notes && <p className="sighting-notes">{sighting.notes}</p>}
      </div>

      {showPhoto && sighting.photoUrl && (
        <PhotoViewer src={sighting.photoUrl} onClose={() => setShowPhoto(false)} />
      )}
    </li>
  )
}
