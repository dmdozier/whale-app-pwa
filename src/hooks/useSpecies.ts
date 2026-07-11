import { useEffect, useState } from 'react'
import { cacheSpecies, getCachedSpecies } from '../lib/db'
import { supabase } from '../lib/supabase'
import type { Species } from '../types/sighting'

export function useSpecies() {
  const [species, setSpecies] = useState<Species[]>([])

  useEffect(() => {
    let cancelled = false

    getCachedSpecies().then((cached) => {
      if (!cancelled && cached.length > 0) setSpecies(cached)
    })

    supabase
      .from('species')
      .select('id, common_name, sort_order')
      .order('sort_order')
      .then(async ({ data, error }) => {
        if (error || !data || cancelled) return
        const fresh: Species[] = data.map((row) => ({
          id: row.id,
          commonName: row.common_name,
          sortOrder: row.sort_order,
        }))
        await cacheSpecies(fresh)
        if (!cancelled) setSpecies(fresh)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return species
}
