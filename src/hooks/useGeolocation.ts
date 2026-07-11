import { useCallback, useState } from 'react'

interface GeolocationResult {
  latitude: number
  longitude: number
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        setError(err.message || 'Could not get your location.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

  return { position, loading, error, requestLocation }
}
