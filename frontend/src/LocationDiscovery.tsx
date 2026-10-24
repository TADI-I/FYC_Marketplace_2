import React, { useEffect, useState } from 'react';
import { MapPin, RefreshCw, X } from 'lucide-react';

export type BuyerLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type DetectedCampus = { id: string; name: string; distanceMeters: number } | null;

type Props = {
  location: BuyerLocation | null;
  detectedCampus: DetectedCampus;
  searching: boolean;
  onLocation: (location: BuyerLocation) => void;
  onDisable: () => void;
  onCorrectCampus: () => void;
};

const PROMPT_KEY = 'fyc_location_prompt_seen';

const locationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) return 'Location permission was denied. You can retry whenever you are ready.';
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your location is currently unavailable. Check your device location settings and retry.';
  if (error.code === error.TIMEOUT) return 'Finding your location took too long. Please retry.';
  return 'We could not find your location. You can keep browsing without it.';
};

const LocationDiscovery = ({
  location,
  detectedCampus,
  searching,
  onLocation,
  onDisable,
  onCorrectCampus
}: Props) => {
  const [showIntro, setShowIntro] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setShowIntro(!location && localStorage.getItem(PROMPT_KEY) !== 'true');
    } catch {
      setShowIntro(!location);
    }
  }, [location]);

  const rememberPrompt = () => {
    try { localStorage.setItem(PROMPT_KEY, 'true'); } catch { /* browsing still works */ }
  };

  const requestLocation = () => {
    rememberPrompt();
    setShowIntro(false);
    setError('');
    if (!navigator.geolocation) {
      setError('Location services are not available in this browser.');
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
      geolocationError => {
        setRequesting(false);
        setError(locationErrorMessage(geolocationError));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const dismiss = () => {
    rememberPrompt();
    setShowIntro(false);
  };

  if (showIntro) {
    return (
      <section className="location-intro" aria-labelledby="location-intro-title">
        <div className="location-icon"><MapPin aria-hidden="true" /></div>
        <div className="location-copy">
          <strong id="location-intro-title">Find what’s closest to you</strong>
          <span>Use your location once to sort nearby products. We don’t continuously track or save it.</span>
        </div>
        <div className="location-actions">
          <button type="button" className="location-primary" onClick={requestLocation}>Use My Location</button>
          <button type="button" className="location-secondary" onClick={dismiss}>Not Now</button>
        </div>
      </section>
    );
  }

  return (
    <section className="location-control" aria-live="polite">
      <div className="location-control-main">
        <MapPin aria-hidden="true" />
        <div>
          {location ? (
            <>
              <strong>{detectedCampus ? `Detected area: ${detectedCampus.name}` : 'Nearby discovery is on'}</strong>
              <span>
                {location.accuracy > 100
                  ? `Approximate reading (±${Math.round(location.accuracy)} m); campus detection may be unavailable.`
                  : 'Products are sorted nearest first.'}
              </span>
            </>
          ) : (
            <><strong>Nearby discovery is off</strong><span>Enable it any time to sort products by distance.</span></>
          )}
        </div>
      </div>

      <div className="location-actions">
        {location ? (
          <>
            <button type="button" className="location-secondary" onClick={requestLocation} disabled={requesting || searching}>
              <RefreshCw aria-hidden="true" className={requesting ? 'location-spin' : ''} /> Refresh
            </button>
            {detectedCampus && <button type="button" className="location-secondary" onClick={onCorrectCampus}>Not right?</button>}
            <button type="button" className="location-secondary" onClick={onDisable}><X aria-hidden="true" /> Disable</button>
          </>
        ) : (
          <button type="button" className="location-primary" onClick={requestLocation} disabled={requesting}>
            {requesting ? 'Finding you…' : 'Use My Location'}
          </button>
        )}
      </div>
      {error && <p className="location-error" role="alert">{error}</p>}
    </section>
  );
};

export default LocationDiscovery;
