import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { NewSightingInput, QueuedSighting } from '../types/sighting'

const DB_NAME = 'whale-sightings'
const DB_VERSION = 1
const STORE_NAME = 'sightings-queue'

interface WhaleSightingsDB extends DBSchema {
  'sightings-queue': {
    key: string
    value: QueuedSighting
    indexes: { 'by-status': string; 'by-createdAt': string }
  }
}

let dbPromise: Promise<IDBPDatabase<WhaleSightingsDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<WhaleSightingsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientId' })
        store.createIndex('by-status', 'status')
        store.createIndex('by-createdAt', 'createdAt')
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
  await db.add(STORE_NAME, sighting)
  return sighting
}

export async function getQueuedSightings(): Promise<QueuedSighting[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex(STORE_NAME, 'by-createdAt')
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
  const existing = await db.get(STORE_NAME, clientId)
  if (!existing) return
  await db.put(STORE_NAME, { ...existing, ...changes })
}

export async function deleteQueuedSighting(clientId: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, clientId)
}
