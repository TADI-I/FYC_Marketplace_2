import React, { useState } from 'react';
import { CheckCircle2, LocateFixed, Loader2 } from 'lucide-react';
import type { CapturedLocation } from './types';

type Props = {
  label: string;
  onLabelChange: (value: string) => void;
  location: CapturedLocation | null;
  onLocation: (value: CapturedLocation) => void;
  hasSavedLocation?: boolean;
  disabled?: boolean;
};

const locationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) return 'Location permission was denied. Allow location access in your browser, then try again.';
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your location is unavailable right now. Check your device location settings.';
  if (error.code === error.TIMEOUT) return 'Finding your location took too long. Please try again.';
  return 'We could not capture this location. Please try again.';
};

const CustomLocationCapture = ({ label, onLabelChange, location, onLocation, hasSavedLocation = false, disabled = false }: Props) => {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const requestLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Location sharing is not available in this browser.');
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setRequesting(false);
        onLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      locationError => {
        setRequesting(false);
        setError(locationErrorMessage(locationError));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const locationReady = Boolean(location || hasSavedLocation);

  return (
    <div className="custom-location-panel">
      <div className="custom-location-copy">
        <LocateFixed aria-hidden="true" />
        <div><strong>Add your pickup area</strong><span>Use this for an accredited residence, unlisted campus, or another pickup area. Exact coordinates stay private.</span></div>
      </div>
      <label className="custom-location-label" htmlFor="custom-location-label">
        Residence, campus or area name
        <input
          id="custom-location-label"
          value={label}
          onChange={event => onLabelChange(event.target.value)}
          placeholder="e.g. residence name or suburb"
          maxLength={80}
          disabled={disabled}
        />
      </label>
      <button type="button" className={`custom-location-button${locationReady ? ' is-ready' : ''}`} onClick={requestLocation} disabled={disabled || requesting}>
        {requesting ? <><Loader2 className="listing-spinner" aria-hidden="true" />Finding location…</> : locationReady ? <><CheckCircle2 aria-hidden="true" />{location ? 'Location captured' : 'Update saved location'}</> : <><LocateFixed aria-hidden="true" />Use current location</>}
      </button>
      {locationReady && <p className="custom-location-status" role="status">{location ? `Ready · accuracy about ${Math.round(location.accuracy)} m` : 'A private location is already saved to this profile.'}</p>}
      {error && <p className="custom-location-error" role="alert">{error}</p>}
    </div>
  );
};

export default CustomLocationCapture;
