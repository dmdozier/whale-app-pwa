import { supabase } from './supabase'
import { deleteQueuedSighting, getPendingSightings, updateQueuedSighting } from './db'
import type { QueuedSighting } from '../types/sighting'

const PHOTO_BUCKET = 'sighting-photos'

// Supabase's own error objects (PostgrestError, StorageError) extend Error, but
// on a network-level failure (DNS, connectivity, CORS) postgrest-js/storage-js
// resolve with a plain { message, hint, ... } object instead of throwing an
// Error instance — `instanceof Error` misses that case entirely and silently
// hides the real reason. Read `.message`/`.hint` directly instead.
function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const { message, hint } = err as { message?: unknown; hint?: unknown }
    if (typeof message === 'string' && message) {
      return typeof hint === 'string' && hint ? `${message} (${hint})` : message
    }
  }
  if (err instanceof Error) return err.message
  return 'Unknown sync error'
}

async function uploadPhoto(userId: string, sighting: QueuedSighting): Promise<string | null> {
  if (!sighting.photo) return null

  const ext = sighting.photo.type === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/${sighting.clientId}.${ext}`

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, sighting.photo, { upsert: true, contentType: sighting.photo.type })

  if (error) throw error

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

async function syncOne(userId: string, sighting: QueuedSighting): Promise<void> {
  await updateQueuedSighting(sighting.clientId, { status: 'syncing' })

  const photoUrl = await uploadPhoto(userId, sighting)

  const { error } = await supabase.from('sightings').upsert(
    {
      user_id: userId,
      species_id: sighting.speciesId,
      latitude: sighting.latitude,
      longitude: sighting.longitude,
      sighted_at: sighting.sightedAt,
      notes: sighting.notes,
      photo_url: photoUrl,
      client_id: sighting.clientId,
      location_type: sighting.locationType,
      distance_estimate: sighting.distanceEstimate,
    },
    { onConflict: 'client_id' },
  )

  if (error) throw error

  await deleteQueuedSighting(sighting.clientId)
}

export async function syncPendingSightings(userId: string): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSightings()
  let synced = 0
  let failed = 0

  for (const sighting of pending) {
    try {
      await syncOne(userId, sighting)
      synced++
    } catch (err) {
      failed++
      await updateQueuedSighting(sighting.clientId, {
        status: 'error',
        lastError: describeError(err),
      })
    }
  }

  return { synced, failed }
}
