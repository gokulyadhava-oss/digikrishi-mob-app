/**
 * Unit test for GpsKalmanFilter with fixed noisy coordinates (no phone, no randomness).
 * Run: npm test -- --testPathPattern=gpsKalmanFilter
 */
import { GpsKalmanFilter } from './gpsKalmanFilter';

/** Fixed base time so tests are deterministic */
const T0 = 1000000000000;

describe('GpsKalmanFilter', () => {
  it('smooths zigzag noise toward a straight line when walking north', () => {
    const filter = new GpsKalmanFilter();

    // Fixed zigzag: straight north (26.1 + i*0.0001) with deterministic ±noise every other step
    // 0.0001 deg ≈ 11 m step; noise ±0.00015 deg ≈ ±17 m so filter must smooth
    const noisyPoints = [
      { latitude: 26.1, longitude: 91.7, accuracy: 15, timestamp: T0 },
      { latitude: 26.10015, longitude: 91.7, accuracy: 15, timestamp: T0 + 2000 }, // +noise
      { latitude: 26.10005, longitude: 91.7, accuracy: 15, timestamp: T0 + 4000 }, // -noise
      { latitude: 26.10025, longitude: 91.7, accuracy: 15, timestamp: T0 + 6000 },
      { latitude: 26.1001, longitude: 91.7, accuracy: 15, timestamp: T0 + 8000 },
      { latitude: 26.10035, longitude: 91.7, accuracy: 15, timestamp: T0 + 10000 },
      { latitude: 26.1002, longitude: 91.7, accuracy: 15, timestamp: T0 + 12000 },
      { latitude: 26.10045, longitude: 91.7, accuracy: 15, timestamp: T0 + 14000 },
      { latitude: 26.1003, longitude: 91.7, accuracy: 15, timestamp: T0 + 16000 },
      { latitude: 26.10055, longitude: 91.7, accuracy: 15, timestamp: T0 + 18000 },
    ];

    const smoothed: { lat: number; lng: number }[] = [];
    noisyPoints.forEach((p) => {
      const out = filter.process(p);
      if (out) smoothed.push({ lat: out.latitude, lng: out.longitude });
    });

    // First point always accepted; min-distance 0.8 m drops some
    expect(smoothed.length).toBeGreaterThanOrEqual(2);
    expect(smoothed.length).toBeLessThanOrEqual(noisyPoints.length);

    // First output must match first input (bootstrap)
    expect(smoothed[0].lat).toBe(26.1);
    expect(smoothed[0].lng).toBe(91.7);

    // Overall trend north: last point north of first
    expect(smoothed[smoothed.length - 1].lat).toBeGreaterThan(26.1);

    // No large backward jump: no step should go south by more than ~2 m (Kalman can pull back slightly)
    const METRES_TO_DEG = 1 / 111320;
    for (let i = 1; i < smoothed.length; i++) {
      const stepDeg = smoothed[i].lat - smoothed[i - 1].lat;
      expect(stepDeg).toBeGreaterThanOrEqual(-2 * METRES_TO_DEG); // allow small pull-back
    }

    // Smoothed range (max - min lat) should be smaller than raw zigzag range → filter reduced noise
    const rawLats = noisyPoints.map((p) => p.latitude);
    const rawSpan = Math.max(...rawLats) - Math.min(...rawLats);
    const smoothSpan = Math.max(...smoothed.map((s) => s.lat)) - Math.min(...smoothed.map((s) => s.lat));
    expect(smoothSpan).toBeLessThanOrEqual(rawSpan + 0.00001);
  });

  it('drops readings worse than MAX_ACCURACY (20m)', () => {
    const filter = new GpsKalmanFilter();
    const bad = filter.process({
      latitude: 26.1,
      longitude: 91.7,
      accuracy: 25,
      timestamp: Date.now(),
    });
    expect(bad).toBeNull();
  });

  it('accepts first good reading and initializes state', () => {
    const filter = new GpsKalmanFilter();
    const first = filter.process({
      latitude: 26.1,
      longitude: 91.7,
      accuracy: 5,
      timestamp: Date.now(),
    });
    expect(first).not.toBeNull();
    expect(first!.latitude).toBe(26.1);
    expect(first!.longitude).toBe(91.7);
  });

  it('reset() clears state so next reading is treated as first', () => {
    const filter = new GpsKalmanFilter();
    filter.process({ latitude: 26.1, longitude: 91.7, accuracy: 5, timestamp: Date.now() });
    filter.reset();
    const afterReset = filter.process({
      latitude: 26.10001,
      longitude: 91.7,
      accuracy: 5,
      timestamp: Date.now() + 1000,
    });
    expect(afterReset).not.toBeNull();
    expect(afterReset!.latitude).toBe(26.10001); // accepted as new first point
  });
});
