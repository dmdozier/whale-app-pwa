export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'

export interface QueuedSighting {
  /** Locally generated UUID; also the dedupe key on the `sightings` table. */
  clientId: string
  latitude: number
  longitude: number
  observedAt: string
  speciesId: string | null
  notes: string | null
  photo: Blob | null
  status: SyncStatus
  createdAt: string
  lastError: string | null
}

export type NewSightingInput = Pick<
  QueuedSighting,
  'latitude' | 'longitude' | 'observedAt' | 'speciesId' | 'notes' | 'photo'
>
