
export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy?: number; // metres — from expo-location coords.accuracy
  timestamp?: number;
}

interface KalmanState {
  lat: number;
  lng: number;
  /** Estimate error covariance (shared — position uncertainty in metres²) */
  P: number;
  lastTimestamp: number;
}

export class GpsKalmanFilter {
  // ─── Tuneable constants ───────────────────────────────────────────────────

  /**
   * Hard accuracy gate (metres).
   * Any reading worse than this is dropped immediately.
   * 20 m covers most urban-canyon / tree-cover scenarios without over-filtering.
   */
  private readonly MAX_ACCURACY_M = 20;

  /**
   * Minimum movement between accepted points (metres).
   * Prevents stationary jitter from creating phantom points.
   */
  private readonly MIN_DISTANCE_M = 0.8;

  /**
   * Process noise — how much we expect the phone to move per second (m/s).
   * Walking speed ≈ 1.2–1.5 m/s, so 3 gives comfortable headroom.
   * Increase if the path looks "laggy" / corners get cut.
   */
  private readonly PROCESS_NOISE_MS = 3; // m/s

  // ─── Internal state ───────────────────────────────────────────────────────

  private state: KalmanState | null = null;

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Feed one raw GPS reading from expo-location.
   * Returns a smoothed { latitude, longitude } point, or null (discard it).
   */
  process(coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp?: number; // ms epoch; falls back to Date.now()
  }): GpsPoint | null {
    const { latitude, longitude, accuracy } = coords;
    const now = coords.timestamp ?? Date.now();
    const acc = accuracy ?? this.MAX_ACCURACY_M; // treat unknown accuracy conservatively

    // ── Step 1: Accuracy gate ────────────────────────────────────────────
    if (acc > this.MAX_ACCURACY_M) {
      return null; // reading is too noisy — discard entirely
    }

    // ── Step 2: Bootstrap — first good reading initialises the filter ────
    if (this.state === null) {
      this.state = {
        lat: latitude,
        lng: longitude,
        P: acc * acc, // initial uncertainty = accuracy²
        lastTimestamp: now,
      };
      return { latitude, longitude, accuracy: acc, timestamp: now };
    }

    // ── Step 3: Kalman predict ───────────────────────────────────────────
    const dtSec = Math.max((now - this.state.lastTimestamp) / 1000, 0.001);
    const Q = this.PROCESS_NOISE_MS * this.PROCESS_NOISE_MS * dtSec;
    const P_pred = this.state.P + Q; // predicted (grown) uncertainty

    // ── Step 4: Kalman update ────────────────────────────────────────────
    const R = acc * acc; // measurement noise = accuracy²
    const K = P_pred / (P_pred + R); // Kalman gain  (0 = trust filter, 1 = trust GPS)

    const smoothLat = this.state.lat + K * (latitude - this.state.lat);
    const smoothLng = this.state.lng + K * (longitude - this.state.lng);
    const P_new = (1 - K) * P_pred;

    // ── Step 5: Minimum-distance gate ────────────────────────────────────
    const distM = haversineM(this.state.lat, this.state.lng, smoothLat, smoothLng);
    if (distM < this.MIN_DISTANCE_M) {
      // Update filter state but don't emit a point (phone hasn't moved enough)
      this.state = { lat: smoothLat, lng: smoothLng, P: P_new, lastTimestamp: now };
      return null;
    }

    // ── Accept the point ─────────────────────────────────────────────────
    this.state = { lat: smoothLat, lng: smoothLng, P: P_new, lastTimestamp: now };
    return { latitude: smoothLat, longitude: smoothLng, accuracy: acc, timestamp: now };
  }

  /** Call this when a new walk session starts (or after "Done"). */
  reset(): void {
    this.state = null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Haversine distance in metres between two lat/lng pairs. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
