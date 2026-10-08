import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, RefreshCw, Check } from 'lucide-react';

interface LocationCaptureProps {
  onLocation: (coords: { latitude: number; longitude: number; accuracy: number }) => void;
}

export const LocationCapture: React.FC<LocationCaptureProps> = ({ onLocation }) => {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        };
        setCoords(c);
        onLocation(c);
        setIsLoading(false);
      },
      err => {
        console.error('Geolocation error:', err);
        let msg = 'Unable to get GPS location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in browser/phone settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS location is currently unavailable. Ensure device location is turned on.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please retry.';
        }
        setError(msg);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return (
    <div className="w-full bg-slate-100 rounded-2xl p-3 border border-slate-200">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 py-1">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
          Acquiring GPS coordinates...
        </div>
      ) : error ? (
        <div className="text-center py-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 mb-1">
            <AlertTriangle className="w-4 h-4" /> Location Error
          </div>
          <p className="text-[11px] text-slate-600">{error}</p>
          <button
            type="button"
            onClick={fetchLocation}
            className="mt-2 px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-medium rounded-lg transition"
          >
            Retry Location
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                GPS Verified <Check className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <p className="text-[11px] text-slate-500">
                {coords?.latitude.toFixed(4)}, {coords?.longitude.toFixed(4)} (±{coords?.accuracy}m)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchLocation}
            title="Refresh GPS"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
