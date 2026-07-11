import { useCallback, useEffect, useState } from 'react'
import { deleteQueuedSighting, getQueuedSightings, queueSighting } from '../lib/db'
import type { NewSightingInput, QueuedSighting } from '../types/sighting'

export function useSightingQueue() {
  const [queue, setQueue] = useState<QueuedSighting[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await getQueuedSightings()
    setQueue(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (input: NewSightingInput) => {
      const sighting = await queueSighting(input)
      await refresh()
      return sighting
    },
    [refresh],
  )

  const remove = useCallback(
    async (clientId: string) => {
      await deleteQueuedSighting(clientId)
      await refresh()
    },
    [refresh],
  )

  return { queue, loading, add, remove, refresh }
}
