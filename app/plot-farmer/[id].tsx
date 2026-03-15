import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  fetchMyPlotMaps,
  fetchMyPlotAdvisories,
  getMyPlot,
  type PlotMapRecord,
  type CropAdvisoryRecord,
  type PlotAdvisoriesResponse,
  type FarmerPlotRecord,
} from '@/lib/api';
import { AdvisoryTab, type Advisory } from '@/components/AdvisoryTab';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 8, longitudeDelta: 8 };
const GREEN = '#22C55E';
const M2_PER_BIGHA = 2500;

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  primary:      '#3D7A4F',
  primaryLight: '#5FA870',
  secondary:    '#82C341',
  bg:           '#F9FBF7',
  surface:      '#FFFFFF',
  text:         '#1B2A1E',
  textMuted:    '#607060',
  border:       '#D0DDD4',
  headerTint:   '#EDF7EF',
  gold:         '#F59E0B',
  blue:         '#2563EB',
};

// ─── Unit conversion helpers ──────────────────────────────────────────────────
function m2ToBigha(m2: number): number {
  return Math.round((m2 / M2_PER_BIGHA) * 100) / 100;
}
function landSizeToBigha(value: number, unit: string | null | undefined): number {
  if (!unit || unit === 'Bigha') return value;
  if (unit === 'Acre')    return Math.round((value * 4046.86 / M2_PER_BIGHA) * 100) / 100;
  if (unit === 'Hectare') return Math.round((value * 10000  / M2_PER_BIGHA) * 100) / 100;
  if (unit === 'Guntha')  return Math.round((value * 101.17 / M2_PER_BIGHA) * 100) / 100;
  return value;
}

// ─── Map helpers ──────────────────────────────────────────────────────────────
function regionFromCoordinates(
  coords: { latitude: number; longitude: number }[],
  paddingFactor = 1.8
) {
  if (coords.length === 0) return { ...DEFAULT_REGION };
  if (coords.length === 1) {
    return { latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 };
  }
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const lngSpan = Math.max(maxLng - minLng, 0.0001);
  return {
    latitude:      (minLat + maxLat) / 2,
    longitude:     (minLng + maxLng) / 2,
    latitudeDelta:  latSpan * paddingFactor,
    longitudeDelta: lngSpan * paddingFactor,
  };
}

// ─── Advisory mapper ──────────────────────────────────────────────────────────
function mapToAdvisory(raw: CropAdvisoryRecord, daysSinceSowing: number | null): Advisory {
  const specRaw = raw.specifications as { text?: string } | string[] | null | undefined;
  const stepsRaw = raw.steps as { text?: string } | Array<{ text?: string; step?: number }> | null | undefined;
  const specifications =
    Array.isArray(specRaw) && specRaw.length > 0
      ? { text: specRaw.filter((s): s is string => typeof s === "string").join("\n") }
      : specRaw?.text != null
        ? { text: String(specRaw.text) }
        : null;
  const steps =
    Array.isArray(stepsRaw) && stepsRaw.length > 0
      ? { text: stepsRaw.map((s) => (s && typeof s === "object" && "text" in s ? String(s.text) : String(s))).join("\n") }
      : stepsRaw?.text != null
        ? { text: String(stepsRaw.text) }
        : null;
  const is_current_period =
    daysSinceSowing != null && raw.start_day != null && raw.end_day != null &&
    daysSinceSowing >= raw.start_day && daysSinceSowing <= raw.end_day;
  return {
    id:               raw.id,
    stage_name:       raw.stage_name,
    activity:         raw.activity,
    activity_time:    raw.activity_time ?? null,
    start_day:        raw.start_day ?? null,
    end_day:          raw.end_day ?? null,
    specifications,
    steps,
    step_index:       (raw as { step_index?: number }).step_index ?? 0,
    is_current_period: (raw as { is_current_period?: boolean }).is_current_period ?? is_current_period,
  };
}

// ─── Spec row ─────────────────────────────────────────────────────────────────
function SpecRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <View style={styles.specRowLeft}>
        <MaterialCommunityIcons name={icon as any} size={14} color={T.primary} />
        <Text style={styles.specRowLabel}>{label}</Text>
      </View>
      <Text style={styles.specRowValue}>{value}</Text>
    </View>
  );
}

// ─── Plot specs card ──────────────────────────────────────────────────────────
function PlotSpecsCard({ plot }: { plot: FarmerPlotRecord | null }) {
  if (!plot) {
    return (
      <View style={styles.specsCard}>
        <ActivityIndicator size="small" color={T.primary} style={{ margin: 16 }} />
      </View>
    );
  }

  const bighaRaw = plot.land_size_value != null
    ? landSizeToBigha(plot.land_size_value, plot.units)
    : null;
  const bigha = typeof bighaRaw === 'number' && isFinite(bighaRaw) ? bighaRaw : null;

  return (
    <View style={styles.specsCard}>
      {/* Green accent top bar */}
      <View style={styles.specsCardTopBar} />

      {/* Bigha hero */}
      {bigha != null && (
        <View style={styles.bighaHero}>
          <Text style={styles.bighaValue}>{bigha.toFixed(2)}</Text>
          <Text style={styles.bighaUnit}>BIGHA</Text>
          {plot.units && plot.units !== 'Bigha' && (
            <Text style={styles.bighaOrig}>({plot.land_size_value} {plot.units})</Text>
          )}
        </View>
      )}

      <View style={styles.specsDivider} />

      {/* Spec rows */}
      <View style={styles.specsRows}>
        {plot.season   && <SpecRow icon="weather-partly-cloudy" label="Season"         value={plot.season} />}
        {plot.variety  && <SpecRow icon="sprout"                label="Variety"         value={plot.variety} />}
        {plot.sowing_date && (
          <SpecRow icon="calendar"   label="Sowing Date"   value={String(plot.sowing_date)} />
        )}
        {plot.farming_type && (
          <SpecRow icon="water-pump" label="Farming Type"  value={plot.farming_type} />
        )}
        {plot.irrigation_method && (
          <SpecRow icon="pipe"       label="Irrigation"    value={plot.irrigation_method} />
        )}
        {plot.sowing_method && (
          <SpecRow icon="gesture-tap-button" label="Sowing Method" value={plot.sowing_method} />
        )}
        {(plot.taluka || plot.district) && (
          <SpecRow icon="map-marker-outline" label="Location"
            value={[plot.taluka, plot.district].filter(Boolean).join(', ')} />
        )}
        {plot.address && (
          <SpecRow icon="home-outline" label="Address" value={String(plot.address)} />
        )}
      </View>
    </View>
  );
}

// ─── Farm carousel dot ────────────────────────────────────────────────────────
function CarouselDot({ active }: { active: boolean }) {
  return (
    <View style={[styles.dot, active && styles.dotActive]} />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'plots'    as const, label: 'My Farm' },
  { id: 'advisory' as const, label: 'Advisory' },
];
type TabId = 'plots' | 'advisory';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function FarmerPlotScreen() {
  const { id: plotId, plotTitle = 'Plot' } = useLocalSearchParams<{
    id: string;
    plotTitle?: string;
    plotMeta?: string;
  }>();
  const router = useRouter();

  const mapRef       = useRef<MapView>(null);
  const mapReadyRef  = useRef(false);

  const [activeTab,         setActiveTab]         = useState<TabId>('plots');
  const [plotDetails,       setPlotDetails]       = useState<FarmerPlotRecord | null>(null);
  const [savedMaps,         setSavedMaps]         = useState<PlotMapRecord[]>([]);
  const [savedMapsLoading,  setSavedMapsLoading]  = useState(true);
  const [advisoriesData,    setAdvisoriesData]    = useState<PlotAdvisoriesResponse | null>(null);
  const [advisoriesLoading, setAdvisoriesLoading] = useState(false);
  const [selectedFarm,      setSelectedFarm]      = useState(0);

  const daysSinceSowing    = advisoriesData?.days_since_sowing ?? null;
  const mappedAdvisories   = (advisoriesData?.advisories ?? []).map((a) => mapToAdvisory(a, daysSinceSowing));
  const weatherSummary     = advisoriesData?.weather ?? null;

  // ── Fit map to a specific farm's coordinates ────────────────────────────────
  const fitToFarm = useCallback((index: number, maps: PlotMapRecord[]) => {
    if (!mapRef.current) return;
    const farm  = maps[index];
    const coords = farm?.coordinates ?? [];
    if (coords.length === 0) {
      // try all farms
      const allCoords = maps.flatMap((m) => m.coordinates ?? []).filter((c) => c?.latitude != null);
      if (allCoords.length === 0) return;
      if (Platform.OS === 'android') {
        mapRef.current.animateToRegion(regionFromCoordinates(allCoords), 500);
      } else {
        mapRef.current.fitToCoordinates(allCoords, { edgePadding: { top: 32, right: 32, bottom: 32, left: 32 }, animated: true });
      }
      return;
    }
    const valid = coords.filter((c) => c?.latitude != null);
    if (valid.length === 0) return;
    if (Platform.OS === 'android') {
      mapRef.current.animateToRegion(regionFromCoordinates(valid), 500);
    } else {
      mapRef.current.fitToCoordinates(valid, { edgePadding: { top: 32, right: 32, bottom: 32, left: 32 }, animated: true });
    }
  }, []);

  const centerOnCurrent = useCallback(() => {
    fitToFarm(selectedFarm, savedMaps);
  }, [selectedFarm, savedMaps, fitToFarm]);

  // ── Called when map finishes mounting ──────────────────────────────────────
  const onMapReady = useCallback(() => {
    mapReadyRef.current = true;
    if (savedMaps.length > 0) {
      // Small delay to ensure map tiles are loaded
      setTimeout(() => fitToFarm(selectedFarm, savedMaps), 300);
    }
  }, [savedMaps, selectedFarm, fitToFarm]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadMaps = useCallback(async () => {
    if (!plotId) return;
    setSavedMapsLoading(true);
    try {
      const list = await fetchMyPlotMaps(plotId);
      setSavedMaps(list);
      setSelectedFarm(0);
      // If map is already ready when data arrives, zoom immediately
      if (mapReadyRef.current && list.length > 0) {
        setTimeout(() => fitToFarm(0, list), 300);
      }
    } catch {
      setSavedMaps([]);
    } finally {
      setSavedMapsLoading(false);
    }
  }, [plotId, fitToFarm]);

  const loadPlotDetails = useCallback(async () => {
    if (!plotId) return;
    try {
      const plot = await getMyPlot(plotId);
      setPlotDetails(plot);
    } catch {
      setPlotDetails(null);
    }
  }, [plotId]);

  const loadAdvisories = useCallback(async () => {
    if (!plotId) return;
    setAdvisoriesLoading(true);
    try {
      const res = await fetchMyPlotAdvisories(plotId);
      setAdvisoriesData(res);
    } catch {
      setAdvisoriesData(null);
    } finally {
      setAdvisoriesLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    loadMaps();
    loadPlotDetails();
  }, [loadMaps, loadPlotDetails]);

  useEffect(() => {
    if (activeTab === 'advisory') loadAdvisories();
  }, [activeTab, loadAdvisories]);

  // When selected farm changes, pan map to it
  useEffect(() => {
    if (savedMaps.length > 0 && mapReadyRef.current) {
      fitToFarm(selectedFarm, savedMaps);
    }
  }, [selectedFarm, savedMaps, fitToFarm]);

  // ── Farm selection from carousel ────────────────────────────────────────────
  const handleFarmSelect = (index: number) => {
    setSelectedFarm(index);
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={T.primary} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{plotTitle}</Text>
          {plotDetails?.season && (
            <Text style={styles.subtitle}>{plotDetails.season}{plotDetails.variety ? ` · ${plotDetails.variety}` : ''}</Text>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── PLOTS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'plots' && (
          <View>
            {/* Map section (moved up) */}
            {savedMapsLoading ? (
              <View style={styles.mapContainer}>
                <ActivityIndicator size="large" color={T.primary} style={{ flex: 1 }} />
              </View>
            ) : savedMaps.length === 0 ? (
              <View style={styles.emptyMap}>
                <MaterialCommunityIcons name="map-outline" size={48} color={T.border} />
                <Text style={styles.emptyTitle}>No boundary mapped yet</Text>
                <Text style={styles.emptySub}>Your field officer will walk the boundary and it will appear here.</Text>
              </View>
            ) : (
              <>
                {/* Summary strip */}
                <View style={styles.summaryStrip}>
                  <MaterialCommunityIcons name="vector-polygon" size={14} color={T.primary} />
                  <Text style={styles.summaryText}>
                    {savedMaps.length} farm{savedMaps.length > 1 ? 's' : ''} mapped
                    {' · '}
                    {m2ToBigha(savedMaps.reduce((a, m) => a + m.area_m2, 0)).toFixed(2)} Bigha total
                  </Text>
                </View>

                {/* Map */}
                <View style={styles.mapContainer}>
                  <MapView
                    ref={mapRef}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={styles.map}
                    initialRegion={DEFAULT_REGION}
                    onMapReady={onMapReady}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    scrollEnabled
                    zoomEnabled
                  >
                    {savedMaps.map((m, idx) =>
                      m.coordinates && m.coordinates.length >= 3 ? (
                        <Polygon
                          key={m.id}
                          coordinates={[...m.coordinates, m.coordinates[0]]}
                          fillColor={idx === selectedFarm ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.12)'}
                          strokeColor={idx === selectedFarm ? GREEN : GREEN + '80'}
                          strokeWidth={idx === selectedFarm ? 3 : 1.5}
                        />
                      ) : null
                    )}
                  </MapView>

                  {/* Center button */}
                  <TouchableOpacity style={styles.centerBtn} onPress={centerOnCurrent} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={20} color={T.primary} />
                  </TouchableOpacity>
                </View>

                {/* Farm carousel */}
                {savedMaps.length > 1 ? (
                  <View style={styles.carouselWrap}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={SCREEN_WIDTH - 32}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                        handleFarmSelect(Math.max(0, Math.min(idx, savedMaps.length - 1)));
                      }}
                      contentContainerStyle={styles.carouselContent}
                    >
                      {savedMaps.map((m, idx) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.farmCard, idx === selectedFarm && styles.farmCardActive]}
                          onPress={() => handleFarmSelect(idx)}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.farmCardAccent, idx === selectedFarm && styles.farmCardAccentActive]} />
                          <View style={styles.farmCardBody}>
                            <Text style={styles.farmCardName}>{m.name || `Farm ${idx + 1}`}</Text>
                            <View style={styles.farmCardMetaRow}>
                              <View style={styles.farmMetaChip}>
                                <MaterialCommunityIcons name="vector-polygon" size={11} color={T.primary} />
                                <Text style={styles.farmMetaChipText}>{m2ToBigha(m.area_m2).toFixed(2)} Bigha</Text>
                              </View>
                            </View>
                          </View>
                          {idx === selectedFarm && (
                            <MaterialCommunityIcons name="check-circle" size={18} color={T.primary} style={{ marginRight: 12 }} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {/* Dots */}
                    <View style={styles.dotsRow}>
                      {savedMaps.map((_, idx) => (
                        <CarouselDot key={idx} active={idx === selectedFarm} />
                      ))}
                    </View>
                  </View>
                ) : (
                  /* Single farm card */
                  <View style={styles.singleFarmCard}>
                    <View style={styles.farmCardBody}>
                      <Text style={styles.farmCardName}>{savedMaps[0].name || 'Farm 1'}</Text>
                      <View style={styles.farmCardMetaRow}>
                        <View style={styles.farmMetaChip}>
                          <MaterialCommunityIcons name="vector-polygon" size={11} color={T.primary} />
                          <Text style={styles.farmMetaChipText}>
                            {m2ToBigha(savedMaps[0].area_m2).toFixed(2)} Bigha
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Plot specs (now below map) */}
            <PlotSpecsCard plot={plotDetails} />
          </View>
        )}

        {/* ── ADVISORY TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'advisory' && (
          <AdvisoryTab
            advisoriesLoading={advisoriesLoading}
            advisories={mappedAdvisories}
            daysSinceSowing={daysSinceSowing}
            weather={weatherSummary}
          />
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surface,
    gap: 10,
  },
  backButton: { padding: 4 },
  titleBlock: { flex: 1 },
  title:      { fontSize: 18, fontWeight: '800', color: T.text },
  subtitle:   { fontSize: 12, color: T.textMuted, marginTop: 2 },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: T.bg,
  },
  tabActive:     { backgroundColor: T.headerTint, borderWidth: 1, borderColor: T.primary + '40' },
  tabText:       { fontSize: 14, fontWeight: '600', color: T.textMuted },
  tabTextActive: { color: T.primary, fontWeight: '700' },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  // ── Specs card ──
  specsCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  specsCardTopBar: { height: 5, backgroundColor: T.primary },
  bighaHero: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: T.headerTint,
  },
  bighaValue: {
    fontSize: 56,
    fontWeight: '900',
    color: T.primary,
    lineHeight: 60,
    letterSpacing: -1,
  },
  bighaUnit: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    color: T.primary,
    marginTop: 2,
  },
  bighaOrig: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 4,
  },
  specsDivider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 16,
  },
  specsRows: { paddingHorizontal: 16, paddingVertical: 8 },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: T.border + '60',
    gap: 8,
  },
  specRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  specRowLabel: { fontSize: 12, color: T.textMuted, fontWeight: '500' },
  specRowValue: { fontSize: 12, fontWeight: '700', color: T.text, flex: 1, textAlign: 'right' },

  // ── Summary strip ──
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.headerTint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  summaryText: { fontSize: 12, color: T.primary, fontWeight: '600' },

  // ── Map ──
  mapContainer: {
    width: '100%', height: 240,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: T.border,
    justifyContent: 'center',
    position: 'relative',
  },
  map: { width: '100%', height: '100%' },
  centerBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: T.border,
  },

  // ── Farm carousel ──
  carouselWrap: { gap: 10 },
  carouselContent: { gap: 8, paddingRight: 8 },
  farmCard: {
    width: SCREEN_WIDTH - 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  farmCardActive: { borderColor: T.primary + '60', backgroundColor: T.headerTint },
  farmCardAccent: { width: 4, alignSelf: 'stretch', backgroundColor: T.border },
  farmCardAccentActive: { width: 4, alignSelf: 'stretch', backgroundColor: T.primary },
  farmCardBody: { flex: 1, padding: 14 },
  farmCardName: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 6 },
  farmCardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  farmMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.headerTint, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 99, borderWidth: 1, borderColor: T.border,
  },
  farmMetaChipText: { fontSize: 11, color: T.primary, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.border },
  dotActive: { backgroundColor: T.primary, width: 16 },

  // ── Single farm card ──
  singleFarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.headerTint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.primary + '40',
    overflow: 'hidden',
  },

  // ── Empty state ──
  emptyMap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  emptySub:   { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
});
