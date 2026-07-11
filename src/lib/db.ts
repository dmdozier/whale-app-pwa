import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { NewSightingInput, QueuedSighting, Species } from '../types/sighting'

const DB_NAME = 'whale-sightings'
const DB_VERSION = 1
const QUEUE_STORE = 'sightings-queue'
const SPECIES_STORE = 'species-cache'

interface WhaleSightingsDB extends DBSchema {
  'sightings-queue': {
    key: string
    value: QueuedSighting
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

export async function queueSighting(input: NewSightingInput): Promise<QueuedSighting> {
  const sighting: QueuedSighting = {
    ...input,
    clientId: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    lastError: null,
  }

  const db = await getDb()
  await db.add(QUEUE_STORE, sighting)
  return sighting
}

export async function getQueuedSightings(): Promise<QueuedSighting[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex(QUEUE_STORE, 'by-createdAt')
  return all.reverse()
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
  await db.put(QUEUE_STORE, { ...existing, ...changes })
}

export async function deleteQueuedSighting(clientId: string): Promise<void> {
  const db = await getDb()
  await db.delete(QUEUE_STORE, clientId)
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
