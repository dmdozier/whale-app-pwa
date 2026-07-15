import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getQueuedSightings, onQueueChanged } from '../lib/db'
import { useSpecies } from './useSpecies'
import type { DisplaySighting, LocationType, DistanceEstimate } from '../types/sighting'

interface SightingRow {
  id: string
  latitude: number
  longitude: number
  sighted_at: string
  notes: string | null
  photo_url: string | null
  location_type: LocationType
  distance_estimate: DistanceEstimate
  species_id: number | null
  species: { common_name: string } | { common_name: string }[] | null
}

function speciesNameFromRow(row: SightingRow): string | null {
  const rel = row.species
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0]?.common_name ?? null) : rel.common_name
}

function fromRow(row: SightingRow): DisplaySighting {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    sightedAt: row.sighted_at,
    speciesName: speciesNameFromRow(row),
    notes: row.notes,
    photoUrl: row.photo_url,
    locationType: row.location_type,
    distanceEstimate: row.distance_estimate,
    isPending: false,
  }
}

export function useSightings() {
  const species = useSpecies()
  const [remote, setRemote] = useState<DisplaySighting[]>([])
  const [pending, setPending] = useState<DisplaySighting[]>([])
  // Whether the local (offline-available) queue has been read at least once.
  const [pendingLoaded, setPendingLoaded] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const photoUrlsRef = useRef<string[]>([])

  const refreshRemote = useCallback(async () => {
    setRemoteLoading(true)
    const { data, error } = await supabase
      .from('sightings')
      .select(
        'id, latitude, longitude, sighted_at, notes, photo_url, location_type, distance_estimate, species_id, species(common_name)',
      )
      .order('sighted_at', { ascending: false })
      .limit(500)

    if (error) {
      setError(error.message)
      setRemoteLoading(false)
      return
    }

    setError(null)
    setRemote((data as SightingRow[]).map(fromRow))
    setRemoteLoading(false)
  }, [])

  const refreshPending = useCallback(async () => {
    const queued = await getQueuedSightings()

    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    photoUrlsRef.current = []

    const speciesById = new Map(species.map((s) => [s.id, s.commonName]))

    const displayed: DisplaySighting[] = queued
      .filter((s) => s.status !== 'synced')
      .map((s) => {
        const photoUrl = s.photo ? URL.createObjectURL(s.photo) : null
        if (photoUrl) photoUrlsRef.current.push(photoUrl)

        return {
          id: s.clientId,
          latitude: s.latitude,
          longitude: s.longitude,
          sightedAt: s.sightedAt,
          speciesName: s.speciesId ? (speciesById.get(s.speciesId) ?? null) : null,
          notes: s.notes,
          photoUrl,
          locationType: s.locationType,
          distanceEstimate: s.distanceEstimate,
          isPending: true,
        }
      })

    setPending(displayed)
    setPendingLoaded(true)
  }, [species])

  useEffect(() => {
    refreshRemote()
    refreshPending()
  }, [refreshRemote, refreshPending])

  // useSightingQueue (App.tsx) mutates the same IndexedDB table independently
  // — without this, a sync completing there never updates this hook's own
  // "pending" snapshot, and a successfully-synced sighting keeps showing as
  // "syncing" here until something else forces a remount.
  useEffect(() => {
    return onQueueChanged(refreshPending)
  }, [refreshPending])

  useEffect(() => {
    const channel = supabase
      .channel('sightings-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sightings' }, () => {
        refreshRemote()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshRemote])

  useEffect(() => {
    return () => {
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([refreshRemote(), refreshPending()])
  }, [refreshRemote, refreshPending])

  return {
    sightings: [...pending, ...remote],
    // Local queue read is near-instant; only block rendering on that, never on the network.
    loading: !pendingLoaded,
    remoteLoading,
    error,
    refresh,
  }
}
