export interface AttendanceConfig {
  officeStartTime?: string; // e.g. "09:30"
  officeEndTime?: string; // e.g. "18:00"
  graceMinutes?: number; // e.g. 15
  minHoursPresent?: number; // e.g. 8
  minHoursHalfDay?: number; // e.g. 4
  officeLat?: number;
  officeLng?: number;
  geofenceRadiusMeters?: number; // e.g. 200
  blockOutsideLocation?: boolean;
}

/**
 * Calculates distance in meters between two GPS coordinates using Haversine formula
 */
export function calculateGpsDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Checks if a given coordinate is within the geofence radius
 */
export function checkGeofence(
  lat: number,
  lng: number,
  config: AttendanceConfig
): { inside: boolean; distanceMeters: number } {
  if (!config.officeLat || !config.officeLng || !config.geofenceRadiusMeters) {
    return { inside: true, distanceMeters: 0 }; // Geofence disabled
  }

  const distance = calculateGpsDistanceMeters(lat, lng, config.officeLat, config.officeLng);
  return {
    inside: distance <= config.geofenceRadiusMeters,
    distanceMeters: distance
  };
}

/**
 * Parses time string (HH:MM or HH:MM:SS) into total minutes from start of day
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Evaluates punch-in status and work hours
 */
export function evaluatePunchStatus(
  inTime: string,
  outTime: string | undefined,
  config: AttendanceConfig
): {
  status: 'Present' | 'Half Day' | 'Late' | 'Absent';
  isLate: boolean;
  totalWorkingMinutes: number;
} {
  const officeStartMin = parseTimeToMinutes(config.officeStartTime || '09:30');
  const graceMinutes = config.graceMinutes ?? 15;
  const lateThreshold = officeStartMin + graceMinutes;

  const inMin = parseTimeToMinutes(inTime);
  const isLate = inMin > lateThreshold;

  if (!outTime) {
    // Only punched in so far
    return {
      status: isLate ? 'Late' : 'Present',
      isLate,
      totalWorkingMinutes: 0
    };
  }

  const outMin = parseTimeToMinutes(outTime);
  const totalMinutes = Math.max(0, outMin - inMin);
  const totalHours = totalMinutes / 60;

  const minHalfDay = config.minHoursHalfDay ?? 4;
  const minPresent = config.minHoursPresent ?? 8;

  let status: 'Present' | 'Half Day' | 'Late' | 'Absent' = 'Present';

  if (totalHours < minHalfDay) {
    status = 'Absent';
  } else if (totalHours < minPresent) {
    status = 'Half Day';
  } else if (isLate) {
    status = 'Late';
  } else {
    status = 'Present';
  }

  return {
    status,
    isLate,
    totalWorkingMinutes: totalMinutes
  };
}
