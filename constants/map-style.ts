/** 
 * Enhanced farm map style — clean modern base with subtle warmth,
 * better field/nature differentiation, slightly oriental tone, 
 * more detail at high zoom without visual noise.
 */
export const FARM_MAP_STYLE = [

  // ── Kill noise ──────────────────────────────────────────────
  { featureType: 'poi',               stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business',      stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',           stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station',   stylers: [{ visibility: 'off' }] },

  // ── Base land — warm stone, not cold white ───────────────────
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#EDE8DF' }],   // slightly warmer than before
  },

  // ── Natural land — paddy/field green with earthy undertone ───
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#DDE8D5' }],   // richer green, less grey
  },
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry',
    stylers: [{ color: '#D4E2C8' }],   // slightly deeper for terrain relief
  },

  // ── Man-made land — slightly cooler to contrast with fields ──
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#E8E2D8' }],
  },

  // ── Water — deeper teal-blue, more vivid ────────────────────
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#B8D8EC' }],   // deeper than #C9E4F0
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7BAEC4' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#EDE8DF' }],
  },

  // ── Roads — clean hierarchy, warm not sterile ────────────────
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F5EDD8' }],   // warm cream instead of pure white
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
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E0D8CC' }, { weight: 0.8 }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F5F0E8' }],   // warmer than before
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E8E0D0' }, { weight: 0.5 }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8C8070' }],   // warm grey text
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#EDE8DF' }],
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
    stylers: [{ color: '#C8BCA8' }, { weight: 0.8 }],  // slightly more visible
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C5248' }],   // warm dark brown — oriental feel
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#EDE8DF' }, { weight: 2 }],
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
    stylers: [{ color: '#C8DDB8' }],   // more saturated than landscape.natural
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

] as const;