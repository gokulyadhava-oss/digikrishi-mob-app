const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const API_BASE = raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
const REQUEST_TIMEOUT_MS = 35000;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getApiBase() {
  return API_BASE;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }
  if (__DEV__) {
    console.log(`[API] ${options.method ?? 'GET'} ${url}`);
  }
  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (e) {
    const err = e as Error & { name?: string };
    const msg =
      err.name === 'AbortError'
        ? 'Request timed out. Is the backend running?'
        : err.message || 'Network error';
    const hint =
      url.includes('localhost') || url.includes('127.0.0.1') || url.match(/192\.168\.\d+\.\d+/)
        ? ' On a physical device: set EXPO_PUBLIC_API_URL in .env to your computer\'s IP (e.g. http://192.168.1.5:8080). Device and computer must be on the same Wi‑Fi.'
        : '';
    throw new Error(`${msg}${hint}`);
  }
  if (__DEV__) {
    console.log(`[API] ${res.status} ${url}`);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error((data as { message?: string })?.message ?? 'Request failed') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  if (!text || !text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function login(email: string, password: string, roleHint: 'FARMER' | 'FIELD_OFFICER') {
  const data = await api<{ token: string; user: { id: string; email: string; role: string; tenant_id: string | null } }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, roleHint }),
    }
  );
  return data;
}

export async function requestFarmerOtp(mobile: string) {
  return api<{ ok: boolean }>('/auth/farmer/request-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
}

export async function verifyFarmerOtp(mobile: string, otp: string) {
  return api<{ token: string; user: { id: string; email: string | null; role: string; tenant_id: string | null } }>(
    '/auth/farmer/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    }
  );
}

export async function fetchMe() {
  return api<{ user: { id: string; email: string; role: string; tenant_id: string | null; Tenant?: { name: string } } }>('/auth/me');
}

export async function fetchMyFarmer() {
  return api<FarmerProfile>('/auth/me/farmer');
}

/** Logged-in farmer: get signed URL for own profile picture. */
export async function fetchMyProfileDownloadUrl() {
  return api<{ url: string }>('/auth/me/profile/download-url');
}

export async function fetchMyAssignedFarmers() {
  return api<FarmerProfile[]>('/auth/me/assigned-farmers');
}

export interface FarmerProfileDetails {
  fpc?: string;
  shg?: string;
  ration_card?: boolean;
  caste?: string | null;
  social_category?: string | null;
}

export interface FarmerProfile {
  id: string;
  farmer_code: string;
  name: string;
  mobile?: string | null;
  gender?: string | null;
  dob?: string | null;
  education?: string | null;
  kyc_status?: string;
  profile_pic_url?: string | null;
  FarmerAddress?: { village?: string; taluka?: string; district?: string; state?: string } | null;
  FarmerProfileDetail?: FarmerProfileDetails | null;
  FarmerBank?: FarmerBank | null;
  FarmerDoc?: FarmerDoc | null;
  FarmerAgentMaps?: Array<{ Agent?: { id: string; email: string | null; mobile: string | null } }>;
}

export interface FarmerAddress {
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
}

export interface FarmerBankPayload {
  bank_name?: string | null;
  ifsc_code?: string | null;
  account_number?: string | null;
  verified?: boolean;
}

export interface FarmerDoc {
  pan_url?: string | null;
  aadhaar_url?: string | null;
  shg_byelaws_url?: string | null;
  extract_7_12_url?: string | null;
  consent_letter_url?: string | null;
  bank_doc_url?: string | null;
  other_doc_url?: string | null;
  aadhaar_number?: string | null;
  pan_number?: string | null;
}

/** Maps docType to FarmerDoc key for "has doc" check. */
export const DOC_TYPE_TO_KEY: Record<string, keyof FarmerDoc> = {
  pan: 'pan_url',
  aadhaar: 'aadhaar_url',
  shg_byelaws: 'shg_byelaws_url',
  extract_7_12: 'extract_7_12_url',
  consent_letter: 'consent_letter_url',
  bank_doc: 'bank_doc_url',
  other: 'other_doc_url',
};

export interface FarmerCreatePayload {
  farmer_code: string;
  name: string;
  mobile?: string | null;
  is_activated?: boolean;
  address?: FarmerAddress | null;
  profileDetails?: FarmerProfileDetails | null;
  bankDetails?: FarmerBankPayload | null;
  docs?: FarmerDoc | null;
}

export interface FarmerBank {
  bank_name?: string | null;
  ifsc_code?: string | null;
  account_number?: string | null;
  verified?: boolean;
}

export interface Farmer extends FarmerProfile {
  is_activated?: boolean;
  FarmerAddress?: FarmerAddress & { id?: string; farmer_id?: string } | null;
  FarmerProfileDetail?: (FarmerProfileDetails & { id?: string; farmer_id?: string }) | null;
  FarmerBank?: FarmerBank & { id?: string; farmer_id?: string } | null;
  FarmerDoc?: FarmerDoc & { id?: string; farmer_id?: string } | null;
}

export async function fetchFarmer(id: string) {
  return api<Farmer>(`/farmers/${id}`);
}

export async function fetchFarmers(page: number, limit: number) {
  return api<{ farmers: Farmer[]; total: number; page: number; limit: number }>(
    `/farmers?page=${page}&limit=${limit}`
  );
}

export async function createFarmer(payload: FarmerCreatePayload) {
  return api<Farmer>('/farmers', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateFarmer(id: string, payload: Partial<FarmerCreatePayload>) {
  return api<Farmer>(`/farmers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

// --- Profile & documents (upload/delete/download) ---

/** Multipart upload: do not set Content-Type so fetch sets boundary. */
async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { method?: string; searchParams?: Record<string, string> } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const search = options.searchParams
    ? '?' + new URLSearchParams(options.searchParams).toString()
    : '';
  const headers: HeadersInit = {};
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }
  if (__DEV__) {
    console.log(`[API] ${options.method ?? 'POST'} ${url}${search}`);
  }
  const res = await fetch(`${url}${search}`, {
    method: options.method ?? 'POST',
    headers,
    body: formData,
  });
  if (__DEV__) {
    console.log(`[API] ${res.status} ${url}${search}`);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error((data as { message?: string })?.message ?? 'Upload failed') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function getProfileDownloadUrl(farmerId: string) {
  return api<{ url: string }>(`/farmers/${farmerId}/profile/download-url`);
}

export async function deleteProfile(farmerId: string) {
  return api<{ message: string }>(`/farmers/${farmerId}/profile`, { method: 'DELETE' });
}

/** Upload profile image. file: { uri, type?, name? } for React Native. */
export async function uploadProfileImage(
  farmerId: string,
  file: { uri: string; type?: string; name?: string },
  overwrite = false
) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type ?? 'image/jpeg',
    name: file.name ?? 'profile.jpg',
  } as unknown as Blob);
  return apiUpload<{ message: string; profile_pic_url: string }>(
    `/farmers/${farmerId}/profile/upload`,
    formData,
    { searchParams: overwrite ? { overwrite: 'true' } : {} }
  );
}

export async function getDocumentDownloadUrl(farmerId: string, docType: string) {
  return api<{ url: string }>(`/farmers/${farmerId}/documents/download-url?docType=${encodeURIComponent(docType)}`);
}

export async function deleteDocument(farmerId: string, docType: string) {
  return api<{ message: string }>(`/farmers/${farmerId}/documents/${encodeURIComponent(docType)}`, { method: 'DELETE' });
}

/** Allowed docType values (must match backend DOC_TYPE_TO_COLUMN). */
export const DOC_TYPES = [
  'pan',
  'aadhaar',
  'shg_byelaws',
  'extract_7_12',
  'consent_letter',
  'bank_doc',
  'other',
] as const;

/** Upload document. file: { uri, type?, name? } for React Native. */
export async function uploadDocument(
  farmerId: string,
  docType: string,
  file: { uri: string; type?: string; name?: string }
) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type ?? 'application/pdf',
    name: file.name ?? `${docType}.pdf`,
  } as unknown as Blob);
  return apiUpload<{ message: string; docType: string; key: string }>(
    `/farmers/${farmerId}/documents/upload`,
    formData,
    { searchParams: { docType } }
  );
}

// --- Plots ---

export interface FarmerPlotPayload {
  season?: string | null;
  variety?: string | null;
  sowing_date?: string | null;
  units?: string | null;
  land_size_value?: number | null;
  sowing_method?: string | null;
  planting_material?: string | null;
  farming_type?: string | null;
  irrigation_method?: string | null;
  address?: string | null;
  pincode?: string | null;
  taluka?: string | null;
  district?: string | null;
}

export interface FarmerPlotRecord extends FarmerPlotPayload {
  id: string;
  farmer_id: string;
  created_at?: string;
  updated_at?: string;
}

export const PLOT_SEASON = ['Kharif', 'Rabi', 'Annual'] as const;
export const PLOT_UNITS = ['Acre', 'Bigha', 'Guntha', 'Hectare'] as const;
export const PLOT_SOWING_METHOD = ['Ridges', 'Furrows'] as const;
export const PLOT_PLANTING_MATERIAL = ['Seeds'] as const;
export const PLOT_FARMING_TYPE = ['Irrigated', 'Rainfed'] as const;
export const PLOT_IRRIGATION_METHOD = ['Drip', 'Furrows'] as const;
export const PLOT_VARIETY = [
  'DKC 9081',
  'Pioneer (All Variants)',
  'Kaveri KMH 4210',
  'NMH 1255',
  'Ganga 5',
  'Vivek Maize Hybrid 53',
  'Bio 9544',
  'Dhawal',
  'Navjot',
  'Ganga 101',
  'Kishan',
  'Vijay',
  'Pratap',
  'CP Bahubali (All Variants)',
  'DKC (All Variants)',
  'Kaveri (All Variants)',
  'Nuziveedu (All Variants)',
  'Global 455',
  'Nilachal GMK 55',
  'Bharati (All Variants)',
  'Shivam',
  'Ayush',
] as const;

export async function fetchPlots(farmerId: string) {
  return api<FarmerPlotRecord[]>(`/farmers/${farmerId}/plots`);
}

/** Logged-in farmer: fetch only plots for this farmer (agent-added or self). */
export async function fetchMyPlots() {
  return api<FarmerPlotRecord[]>('/auth/me/plots');
}

/** Logged-in farmer: create a plot for self. */
export async function createMyPlot(payload: FarmerPlotPayload) {
  return api<FarmerPlotRecord>('/auth/me/plots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Logged-in farmer: get one own plot. */
export async function getMyPlot(plotId: string) {
  return api<FarmerPlotRecord>(`/auth/me/plots/${plotId}`);
}

/** Logged-in farmer: update own plot. */
export async function updateMyPlot(plotId: string, payload: FarmerPlotPayload) {
  return api<FarmerPlotRecord>(`/auth/me/plots/${plotId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Logged-in farmer: delete own plot. */
export async function deleteMyPlot(plotId: string) {
  return api<{ message: string }>(`/auth/me/plots/${plotId}`, { method: 'DELETE' });
}

/** Crop advisory row returned by advisories API. */
export interface CropAdvisoryRecord {
  id: string;
  stage_name: string;
  activity: string;
  activity_type: string | null;
  activity_code: string | null;
  activity_time: string | null;
  start_day: number | null;
  end_day: number | null;
  specifications: Record<string, unknown> | null;
  steps: unknown[] | null;
  /** 1-based step order from API (current period). */
  step_index?: number;
  /** True if days_since_sowing falls in [start_day, end_day]. */
  is_current_period?: boolean;
}

export interface WeatherSummary {
  temperature_c: number | null;
  humidity: number | null;
  description: string | null;
  icon: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  // raw payload from OpenWeather; structure not guaranteed
  raw?: any;
}

export interface PlotAdvisoriesResponse {
  days_since_sowing: number | null;
  advisories: CropAdvisoryRecord[];
  /** Optional weather summary (present for agent + farmer plot advisories when weather is configured). */
  weather?: WeatherSummary | null;
}

/** Logged-in farmer: fetch advisories for one of their plots. */
export async function fetchMyPlotAdvisories(plotId: string) {
  return api<PlotAdvisoriesResponse>(`/auth/me/plots/${plotId}/advisories`);
}

/** Agent: fetch advisories for a farmer's plot. */
export async function fetchPlotAdvisories(farmerId: string, plotId: string) {
  return api<PlotAdvisoriesResponse>(`/farmers/${farmerId}/plots/${plotId}/advisories`);
}

export async function getPlot(farmerId: string, plotId: string) {
  return api<FarmerPlotRecord>(`/farmers/${farmerId}/plots/${plotId}`);
}

export async function createPlot(farmerId: string, payload: FarmerPlotPayload) {
  return api<FarmerPlotRecord>(`/farmers/${farmerId}/plots`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePlot(farmerId: string, plotId: string, payload: FarmerPlotPayload) {
  return api<FarmerPlotRecord>(`/farmers/${farmerId}/plots/${plotId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePlot(farmerId: string, plotId: string) {
  return api<{ message: string }>(`/farmers/${farmerId}/plots/${plotId}`, { method: 'DELETE' });
}

// --- Plot map (farmer_plot_map / track) ---

export interface PlotMapRecord {
  id: string;
  plot_id: string;
  name: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  area_m2: number;
  area_acres: number;
  area_hectares: number;
  value?: number | null;
  currency?: string | null;
  created_at?: string;
}

/** List plot maps (farms) for a plot. May be restricted to agents; farmers should use fetchMyPlotMaps. */
export async function fetchPlotMaps(plotId: string) {
  return api<PlotMapRecord[]>(`/farms?plot_id=${encodeURIComponent(plotId)}`);
}

/** Logged-in farmer: list maps (farms) for one of their own plots. Use this instead of fetchPlotMaps when the user is a farmer to avoid 403. */
export async function fetchMyPlotMaps(plotId: string) {
  return api<PlotMapRecord[]>(`/auth/me/plots/${plotId}/farms`);
}

export async function trackPlotMap(plotId: string, body: { session_id: string; points: Array<{ latitude: number; longitude: number; accuracy?: number; timestamp?: number }> }) {
  return api<{ ok: boolean }>('/farms/track', {
    method: 'POST',
    body: JSON.stringify({ plot_id: plotId, ...body }),
  });
}

export async function createPlotMap(body: {
  plot_id: string;
  session_id?: string;
  name: string;
  value?: number;
  currency?: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  gps_path?: Array<{ latitude: number; longitude: number; accuracy?: number; timestamp?: number }>;
  area_m2: number;
  area_acres: number;
  area_hectares: number;
}) {
  return api<PlotMapRecord>('/farms', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
