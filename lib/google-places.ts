/**
 * Google Places Autocomplete + Place Details, and Geocoding (reverse) for address auto-fill.
 * Places API and Geocoding API must be enabled for the key.
 * Key from EXPO_PUBLIC_GOOGLE_MAPS_APIKEY (same as Maps).
 */

const PLACE_BASE = 'https://maps.googleapis.com/maps/api/place';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode';

export interface PlacePrediction {
  place_id: string;
  description: string;
}

export interface ParsedAddress {
  address: string;
  pincode: string | null;
  taluka: string | null;
  district: string | null;
}

function getApiKey(): string {
  return (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY) ?? '';
}

/**
 * Fetch place autocomplete predictions for a search string.
 * Optional: restrict to India with components=country:in.
 */
export async function fetchPlacePredictions(
  input: string,
  options?: { country?: string }
): Promise<PlacePrediction[]> {
  const key = getApiKey();
  if (!key || input.trim().length < 2) return [];

  const params = new URLSearchParams({
    input: input.trim(),
    key,
    ...(options?.country && { components: `country:${options.country}` }),
  });
  const url = `${PLACE_BASE}/autocomplete/json?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message ?? data.status ?? 'Autocomplete failed');
  }
  const predictions = (data.predictions ?? []) as Array<{ place_id: string; description: string }>;
  return predictions.map((p) => ({ place_id: p.place_id, description: p.description }));
}

/**
 * Fetch place details by place_id and parse into address, pincode, taluka, district.
 */
export async function fetchPlaceDetails(placeId: string): Promise<ParsedAddress> {
  const key = getApiKey();
  if (!key) throw new Error('Google Maps API key not configured');

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: 'address_components,formatted_address',
  });
  const url = `${PLACE_BASE}/details/json?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') {
    throw new Error(data.error_message ?? data.status ?? 'Place details failed');
  }
  const result = data.result as {
    formatted_address?: string;
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  };
  return parseAddressComponents(
    result.formatted_address ?? '',
    result.address_components ?? []
  );
}

/**
 * Reverse geocode: lat/lng → address, pincode, taluka, district.
 * One-shot fill from current location (no search).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ParsedAddress> {
  const key = getApiKey();
  if (!key) throw new Error('Google Maps API key not configured');

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key,
  });
  const url = `${GEOCODE_BASE}/json?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message ?? data.status ?? 'Reverse geocode failed');
  }
  const results = (data.results ?? []) as Array<{
    formatted_address?: string;
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  }>;
  const first = results[0];
  if (!first) {
    return { address: '', pincode: null, taluka: null, district: null };
  }
  return parseAddressComponents(
    first.formatted_address ?? '',
    first.address_components ?? []
  );
}

function getComponent(
  components: Array<{ long_name: string; types: string[] }>,
  ...types: string[]
): string | null {
  const c = components.find((x) => types.some((t) => x.types.includes(t)));
  return c?.long_name ?? null;
}

function parseAddressComponents(
  formattedAddress: string,
  addressComponents: Array<{ long_name: string; types: string[] }>
): ParsedAddress {
  const comps = addressComponents.map((c) => ({ long_name: c.long_name, types: c.types }));
  const pincode = getComponent(comps, 'postal_code');
  const district = getComponent(comps, 'administrative_area_level_2');
  const state = getComponent(comps, 'administrative_area_level_1');
  const locality = getComponent(comps, 'locality');
  const sublocality1 = getComponent(comps, 'sublocality_level_1', 'sublocality');
  const taluka = getComponent(comps, 'administrative_area_level_3') ?? locality ?? sublocality1 ?? null;
  return {
    address: formattedAddress,
    pincode,
    taluka,
    district: district ?? state,
  };
}
