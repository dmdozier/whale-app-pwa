import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { NewSightingInput, QueuedSighting, Species } from '../types/sighting'

const DB_NAME = 'whale-sightings'
const DB_VERSION = 1
const QUEUE_STORE = 'sightings-queue'
const SPECIES_STORE = 'species-cache'

interface StoredPhoto {
  data: ArrayBuffer
  type: string
}

// Safari has a long-standing WebKit bug where Blobs stored directly in
// IndexedDB can come back corrupted/empty on read — this breaks photo
// uploads silently (Supabase Storage rejects the empty body with "No
// content provided"). Storing the raw bytes as an ArrayBuffer instead
// avoids it; the Blob is reconstructed on the way out.
type StoredSighting = Omit<QueuedSighting, 'photo'> & { photo: StoredPhoto | null }

interface WhaleSightingsDB extends DBSchema {
  'sightings-queue': {
    key: string
    value: StoredSighting
    indexes: { 'by-status': string; 'by-createdAt': string }
  }
  'species-cache': {
    key: number
    value: Species
  }
}

let dbPromise: Promise<IDBPDatabase<WhaleSightingsDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<WhaleSightingsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const queue = db.createObjectStore(QUEUE_STORE, { keyPath: 'clientId' })
        queue.createIndex('by-status', 'status')
        queue.createIndex('by-createdAt', 'createdAt')

        db.createObjectStore(SPECIES_STORE, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

async function toStoredPhoto(photo: Blob | null): Promise<StoredPhoto | null> {
  if (!photo) return null
  return { data: await photo.arrayBuffer(), type: photo.type }
}

function fromStoredPhoto(stored: StoredPhoto | Blob | null): Blob | null {
  if (!stored) return null
  // Tolerate any sighting queued before this fix, stored as a raw Blob.
  if (stored instanceof Blob) return stored
  return new Blob([stored.data], { type: stored.type })
}

type QueueListener = () => void
const queueListeners = new Set<QueueListener>()

function notifyQueueChanged() {
  queueListeners.forEach((listener) => listener())
}

/** Notified whenever the queue is mutated, regardless of which hook instance did it — needed since useSightingQueue and useSightings each keep their own snapshot of the same IndexedDB table. */
export function onQueueChanged(listener: QueueListener): () => void {
  queueListeners.add(listener)
  return () => queueListeners.delete(listener)
}

export async function queueSighting(input: NewSightingInput): Promise<QueuedSighting> {
  const sighting: QueuedSighting = {
    ...input,
    clientId: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    lastError: null,
  }

  const db = await getDb()
  await db.add(QUEUE_STORE, { ...sighting, photo: await toStoredPhoto(input.photo) })
  notifyQueueChanged()
  return sighting
}

export async function getQueuedSightings(): Promise<QueuedSighting[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex(QUEUE_STORE, 'by-createdAt')
  return all.reverse().map((s) => ({ ...s, photo: fromStoredPhoto(s.photo) }))
}

export async function getPendingSightings(): Promise<QueuedSighting[]> {
  const all = await getQueuedSightings()
  return all.filter((s) => s.status === 'pending' || s.status === 'error')
}

export async function updateQueuedSighting(
  clientId: string,
  changes: Partial<QueuedSighting>,
): Promise<void> {
  const db = await getDb()
  const existing = await db.get(QUEUE_STORE, clientId)
  if (!existing) return

  const { photo, ...rest } = changes
  const storedChanges: Partial<StoredSighting> = { ...rest }
  if ('photo' in changes) {
    storedChanges.photo = await toStoredPhoto(photo ?? null)
  }

  await db.put(QUEUE_STORE, { ...existing, ...storedChanges })
  notifyQueueChanged()
}

export async function deleteQueuedSighting(clientId: string): Promise<void> {
  const db = await getDb()
  await db.delete(QUEUE_STORE, clientId)
  notifyQueueChanged()
}

export async function cacheSpecies(species: Species[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(SPECIES_STORE, 'readwrite')
  await Promise.all(species.map((s) => tx.store.put(s)))
  await tx.done
}

export async function getCachedSpecies(): Promise<Species[]> {
  const db = await getDb()
  const all = await db.getAll(SPECIES_STORE)
  return all.sort((a, b) => a.sortOrder - b.sortOrder)
}
