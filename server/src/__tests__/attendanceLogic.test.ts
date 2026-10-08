import { calculateGpsDistanceMeters, checkGeofence, evaluatePunchStatus, AttendanceConfig } from '../utils/attendanceLogic';

describe('Attendance Logic and Geofencing', () => {
  const officeConfig: AttendanceConfig = {
    officeStartTime: '09:30',
    officeEndTime: '18:00',
    graceMinutes: 15,
    minHoursPresent: 8,
    minHoursHalfDay: 4,
    officeLat: 10.0159,
    officeLng: 76.3419,
    geofenceRadiusMeters: 200
  };

  test('calculates GPS distance accurately within office radius', () => {
    // Exact location
    const dist = calculateGpsDistanceMeters(10.0159, 76.3419, 10.0159, 76.3419);
    expect(dist).toBe(0);

    const check = checkGeofence(10.0159, 76.3419, officeConfig);
    expect(check.inside).toBe(true);
  });

  test('flags punches outside geofence radius', () => {
    // Location ~1km away
    const check = checkGeofence(10.0250, 76.3500, officeConfig);
    expect(check.inside).toBe(false);
    expect(check.distanceMeters).toBeGreaterThan(200);
  });

  test('evaluates on-time vs late status correctly based on grace minutes', () => {
    // 09:35 is on-time (within 15 min grace of 09:30)
    const onTime = evaluatePunchStatus('09:35:00', undefined, officeConfig);
    expect(onTime.status).toBe('Present');
    expect(onTime.isLate).toBe(false);

    // 09:50 is Late
    const late = evaluatePunchStatus('09:50:00', undefined, officeConfig);
    expect(late.status).toBe('Late');
    expect(late.isLate).toBe(true);
  });

  test('evaluates half-day status when working hours are between 4 and 8 hours', () => {
    // 09:30 to 14:30 = 5 hours -> Half Day
    const halfDay = evaluatePunchStatus('09:30:00', '14:30:00', officeConfig);
    expect(halfDay.status).toBe('Half Day');
  });
});
