import { Platform } from 'react-native';

/** 
 * Light style — warm, clean farm map.
 */
const FARM_MAP_STYLE_LIGHT = [

  // ── Kill noise ──────────────────────────────────────────────
  { featureType: 'poi',               stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business',      stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',           stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station',   stylers: [{ visibility: 'off' }] },

  // ── Base land — warm stone, not cold white ───────────────────
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#E0D9CE' }],   // was #EDE8DF — darker so roads stand out on Android
  },

  // ── Natural land — paddy/field green with earthy undertone ───
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#DDE8D5' }],
  },
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry',
    stylers: [{ color: '#D4E2C8' }],
  },

  // ── Man-made land — slightly cooler to contrast with fields ──
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#D8D2C6' }],   // was #E8E2D8
  },

  // ── Water — deeper teal-blue, more vivid ────────────────────
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#B8D8EC' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7BAEC4' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#E0D9CE' }],   // matched to new base
  },

  // ── Roads — clean hierarchy, warm not sterile ────────────────
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#EFE4C4' }],   // was #F5EDD8
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D4C8A8' }, { weight: 1.5 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8C7B5C' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F0EBE0' }],   // was #FFFFFF — biggest Android culprit
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D8D0C4' }, { weight: 0.8 }],  // was #E0D8CC
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.fill',
    stylers: [{ color: '#E8E2D6' }],   // was #F5F0E8
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D8D0C4' }, { weight: 0.5 }],  // was #E8E0D0
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8C8070' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#E0D9CE' }],   // matched to new base
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },

  // ── Administrative — visible but quiet ───────────────────────
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#C8BCA8' }, { weight: 0.8 }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C5248' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#E0D9CE' }, { weight: 2 }],    // matched to new base
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8C7B6C' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

  // ── Parks / reserves — richer green ─────────────────────────
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#C8DDB8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

] as const;

/**
 * Dark map style — Uber / Zomato dark-mode aesthetic.
 * Near-black neutral base, white-gray roads that clearly pop,
 * blue water, subtle green parks. No green tint on land.
 */
const FARM_MAP_STYLE_DARK_ANDROID = [

  // ── Kill noise ──────────────────────────────────────────────
  { featureType: 'poi',             stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business',    stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',         stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },

  // ── Base land — near-black neutral (not green) ───────────────
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#1A1C1E' }],   // Uber-style dark charcoal
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#1C2020' }],   // just a whisper of green
  },
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry',
    stylers: [{ color: '#1E2222' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#1E2022' }],   // coolest — slightly blue-gray
  },

  // ── Water — vivid enough to read clearly ────────────────────
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#162430' }],   // deep slate-blue like Uber
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5A8A9F' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1C1E' }],
  },

  // ── Roads — THE KEY: light on dark, clear 3-level hierarchy ──
  //    Highway  → brightest  ~#4A4D50 fill + #686C70 stroke
  //    Arterial → mid        ~#333638
  //    Local    → dimmest    ~#262829
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#4A4D52' }],   // visibly lighter than base
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#686C72' }, { weight: 1.5 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#E0E2E4' }],   // near-white label
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1C1E' }],
  },

  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#333638' }],   // clearly above base, below highway
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4A4E52' }, { weight: 0.8 }],
  },

  {
    featureType: 'road.local',
    elementType: 'geometry.fill',
    stylers: [{ color: '#272A2C' }],   // barely above base — local roads whisper
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#363A3C' }, { weight: 0.5 }],
  },

  // Shared road labels
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#BCBFC2' }],   // light gray — Uber style
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1C1E' }],
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },

  // ── Administrative ───────────────────────────────────────────
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3A3D40' }, { weight: 0.8 }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D8DADC' }],   // bright white-ish — readable
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1C1E' }, { weight: 2.5 }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8A8E92' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1C1E' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

  // ── Parks — distinct from base but not garish ────────────────
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1E2820' }],   // subtly greener than base
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

] as const;

/** Dark on Android (no blow-out), light on iOS. */
export const FARM_MAP_STYLE =
  Platform.OS === 'android' ? FARM_MAP_STYLE_DARK_ANDROID : FARM_MAP_STYLE_LIGHT;