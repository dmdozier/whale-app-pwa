const EARTH_RADIUS_MILES = 3958.8

export interface LatLng {
  latitude: number
  longitude: number
}

export function haversineDistanceMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

const MILES_PER_DEGREE_LATITUDE = 69.0

/**
 * Rectangular bounds guaranteed to contain a circle of the given radius —
 * pure math, no dependency on a Leaflet layer being attached to a map
 * (unlike `L.Circle#getBounds()`, which needs `this._map` to be set).
 */
export function boundingBoxForRadius(
  center: LatLng,
  radiusMiles: number,
): [[number, number], [number, number]] {
  const dLat = radiusMiles / MILES_PER_DEGREE_LATITUDE
  const dLng =
    radiusMiles / (MILES_PER_DEGREE_LATITUDE * Math.cos((center.latitude * Math.PI) / 180))

  return [
    [center.latitude - dLat, center.longitude - dLng],
    [center.latitude + dLat, center.longitude + dLng],
  ]
}

export interface DriveTimeOption {
  label: string
  minutes: number
  radiusMiles: number
}

/** Rough drive-time-to-radius estimates — not a real routing API. */
export const DRIVE_TIME_OPTIONS: DriveTimeOption[] = [
  { label: '10 min', minutes: 10, radiusMiles: 5 },
  { label: '30 min', minutes: 30, radiusMiles: 20 },
  { label: '1 hr', minutes: 60, radiusMiles: 40 },
]
