import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useSpecies } from '../hooks/useSpecies'
import type { DistanceEstimate, LocationType, NewSightingInput } from '../types/sighting'

interface LogSightingFormProps {
  onSubmit: (input: NewSightingInput) => Promise<void>
  onCancel: () => void
}

export function LogSightingForm({ onSubmit, onCancel }: LogSightingFormProps) {
  const { position, loading: locating, error: locationError, requestLocation } = useGeolocation()
  const species = useSpecies()
  const [sightedAt] = useState(() => new Date().toISOString())

  const [locationType, setLocationType] = useState<LocationType | null>(null)
  const [distanceEstimate, setDistanceEstimate] = useState<DistanceEstimate | null>(null)
  const [speciesId, setSpeciesId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  const notSure = useMemo(() => species.find((s) => s.commonName === 'Not Sure'), [species])

  useEffect(() => {
    if (speciesId === null && notSure) setSpeciesId(notSure.id)
  }, [notSure, speciesId])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  const canSubmit = position && locationType && distanceEstimate && !submitting

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!position || !locationType || !distanceEstimate) return

    setSubmitting(true)
    await onSubmit({
      latitude: position.latitude,
      longitude: position.longitude,
      sightedAt,
      speciesId,
      notes: notes.trim() || null,
      photo,
      locationType,
      distanceEstimate,
    })
    setSubmitting(false)
  }

  return (
    <form className="log-form" onSubmit={handleSubmit}>
      <h2>Log a sighting</h2>

      <div className="log-field">
        <span className="log-label">Location</span>
        {locating && <p className="log-status">Getting your location…</p>}
        {locationError && (
          <p className="log-error">
            {locationError}{' '}
            <button type="button" onClick={requestLocation}>
              Retry
            </button>
          </p>
        )}
        {position && (
          <p className="log-status">
            {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
          </p>
        )}
      </div>

      <div className="log-field">
        <span className="log-label">Where were you?</span>
        <div className="segmented">
          <button
            type="button"
            className={locationType === 'land' ? 'active' : ''}
            onClick={() => setLocationType('land')}
          >
            Land
          </button>
          <button
            type="button"
            className={locationType === 'sea' ? 'active' : ''}
            onClick={() => setLocationType('sea')}
          >
            Sea
          </button>
        </div>
      </div>

      <div className="log-field">
        <span className="log-label">How far was it?</span>
        <div className="segmented">
          <button
            type="button"
            className={distanceEstimate === 'near' ? 'active' : ''}
            onClick={() => setDistanceEstimate('near')}
          >
            Near
          </button>
          <button
            type="button"
            className={distanceEstimate === 'medium' ? 'active' : ''}
            onClick={() => setDistanceEstimate('medium')}
          >
            Medium
          </button>
          <button
            type="button"
            className={distanceEstimate === 'far' ? 'active' : ''}
            onClick={() => setDistanceEstimate('far')}
          >
            Far
          </button>
        </div>
      </div>

      <label className="log-field">
        <span className="log-label">Species (optional)</span>
        <select
          value={speciesId ?? ''}
          onChange={(e) => setSpeciesId(e.target.value ? Number(e.target.value) : null)}
        >
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.commonName}
            </option>
          ))}
        </select>
      </label>

      <label className="log-field">
        <span className="log-label">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>

      <label className="log-field">
        <span className="log-label">Photo (optional)</span>
        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} />
        {photoPreview && <img src={photoPreview} alt="" className="log-photo-preview" />}
      </label>

      <div className="log-actions">
        <button type="button" className="log-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit}>
          {submitting ? 'Saving…' : 'Log sighting'}
        </button>
      </div>
    </form>
  )
}
