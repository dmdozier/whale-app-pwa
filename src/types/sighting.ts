export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'
export type LocationType = 'sea' | 'land'
export type DistanceEstimate = 'near' | 'medium' | 'far'

export interface Species {
  id: number
  commonName: string
  sortOrder: number
}

export interface QueuedSighting {
  /** Locally generated UUID; matches the `sightings.client_id` dedupe column. */
  clientId: string
  latitude: number
  longitude: number
  sightedAt: string
  speciesId: number | null
  notes: string | null
  photo: Blob | null
  locationType: LocationType
  distanceEstimate: DistanceEstimate
  status: SyncStatus
  createdAt: string
  lastError: string | null
}

export type NewSightingInput = Pick<
  QueuedSighting,
  | 'latitude'
  | 'longitude'
  | 'sightedAt'
  | 'speciesId'
  | 'notes'
  | 'photo'
  | 'locationType'
  | 'distanceEstimate'
>

/** Unified shape for rendering, whether the sighting is already synced or still local-only. */
export interface DisplaySighting {
  id: string
  latitude: number
  longitude: number
  sightedAt: string
  speciesName: string | null
  notes: string | null
  photoUrl: string | null
  locationType: LocationType
  distanceEstimate: DistanceEstimate
  isPending: boolean
}
