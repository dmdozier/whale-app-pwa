import { useCallback, useEffect, useState } from 'react'
import { deleteQueuedSighting, getQueuedSightings, queueSighting } from '../lib/db'
import { syncPendingSightings } from '../lib/sync'
import { useOnlineStatus } from './useOnlineStatus'
import type { NewSightingInput, QueuedSighting } from '../types/sighting'

// iOS Safari's online/offline events are unreliable, especially for installed
// PWAs, so we don't rely on connectivity-change detection alone to retry.
const RETRY_INTERVAL_MS = 30_000

export function useSightingQueue(userId: string | null) {
  const [queue, setQueue] = useState<QueuedSighting[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const isOnline = useOnlineStatus()

  const refresh = useCallback(async () => {
    const all = await getQueuedSightings()
    setQueue(all)
    setLoading(false)
  }, [])

  const sync = useCallback(async () => {
    if (!userId || !navigator.onLine) return
    setSyncing(true)
    try {
      await syncPendingSightings(userId)
    } finally {
      setSyncing(false)
      await refresh()
    }
  }, [userId, refresh])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (isOnline && userId) sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, userId])

  useEffect(() => {
    if (!userId) return
    const hasPending = queue.some((s) => s.status !== 'synced')
    if (!hasPending) return

    const interval = setInterval(() => sync(), RETRY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [userId, queue, sync])

  const add = useCallback(
    async (input: NewSightingInput) => {
      const sighting = await queueSighting(input)
      await refresh()
      sync()
      return sighting
    },
    [refresh, sync],
  )

  const remove = useCallback(
    async (clientId: string) => {
      await deleteQueuedSighting(clientId)
      await refresh()
    },
    [refresh],
  )

  return { queue, loading, syncing, isOnline, add, remove, refresh, sync }
}
