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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { fetchMyPlotMaps, fetchMyPlotAdvisories, type PlotMapRecord, type CropAdvisoryRecord, type PlotAdvisoriesResponse } from '@/lib/api';
import { AdvisoryTab, type Advisory } from '@/components/AdvisoryTab';

const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 0.004, longitudeDelta: 0.004 };
const GREEN = '#22C55E';

function regionFromCoordinates(
  coords: { latitude: number; longitude: number }[],
  paddingFactor = 1.6
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  if (coords.length === 0) return { ...DEFAULT_REGION };
  if (coords.length === 1) {
    return { latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 };
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
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latSpan * paddingFactor,
    longitudeDelta: lngSpan * paddingFactor,
  };
}

const T = {
  primary: '#3D7A4F',
  primaryLight: '#5FA870',
  bg: '#F9FBF7',
  surface: '#FFFFFF',
  text: '#1B2A1E',
  textMuted: '#607060',
  border: '#D0DDD4',
  headerTint: '#EDF7EF',
};

const TABS = [
  { id: 'plots' as const, label: 'Plots' },
  { id: 'advisory' as const, label: 'Advisory' },
];

type TabId = 'plots' | 'advisory';

function mapToAdvisory(raw: CropAdvisoryRecord, daysSinceSowing: number | null): Advisory {
  const spec = raw.specifications as { text?: string } | null | undefined;
  const stepsObj = raw.steps as { text?: string } | null | undefined;
  const is_current_period =
    daysSinceSowing != null && raw.start_day != null && raw.end_day != null &&
    daysSinceSowing >= raw.start_day && daysSinceSowing <= raw.end_day;
  return {
    id: raw.id,
    stage_name: raw.stage_name,
    activity: raw.activity,
    activity_time: raw.activity_time ?? null,
    start_day: raw.start_day ?? null,
    end_day: raw.end_day ?? null,
    specifications: spec?.text != null ? { text: String(spec.text) } : null,
    steps: stepsObj?.text != null ? { text: String(stepsObj.text) } : null,
    step_index: (raw as { step_index?: number }).step_index ?? 0,
    is_current_period: (raw as { is_current_period?: boolean }).is_current_period ?? is_current_period,
  };
}

export default function FarmerPlotScreen() {
  const { id: plotId, plotTitle = 'Plot', plotMeta = '' } = useLocalSearchParams<{
    id: string;
    plotTitle?: string;
    plotMeta?: string;
  }>();
  const router = useRouter();

  const mapRef = useRef<MapView>(null);
  const [activeTab, setActiveTab] = useState<TabId>('plots');
  const [savedMaps, setSavedMaps] = useState<PlotMapRecord[]>([]);
  const [savedMapsLoading, setSavedMapsLoading] = useState(true);
  const [advisoriesData, setAdvisoriesData] = useState<PlotAdvisoriesResponse | null>(null);
  const [advisoriesLoading, setAdvisoriesLoading] = useState(false);

  const daysSinceSowing = advisoriesData?.days_since_sowing ?? null;
  const mappedAdvisories: Advisory[] = (advisoriesData?.advisories ?? []).map((a) =>
    mapToAdvisory(a, daysSinceSowing)
  );

  const loadMaps = useCallback(async () => {
    if (!plotId) return;
    setSavedMapsLoading(true);
    try {
      const list = await fetchMyPlotMaps(plotId);
      setSavedMaps(list);
    } catch {
      setSavedMaps([]);
    } finally {
      setSavedMapsLoading(false);
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
  }, [loadMaps]);

  useEffect(() => {
    if (activeTab === 'advisory') loadAdvisories();
  }, [activeTab, loadAdvisories]);

  // Fit map to show all saved polygons when maps load (Plots tab)
  useEffect(() => {
    if (savedMapsLoading || savedMaps.length === 0 || !mapRef.current) return;
    const allCoords = savedMaps.flatMap((m) => m.coordinates ?? []).filter((c) => c && c.latitude != null && c.longitude != null);
    if (allCoords.length === 0) return;
    const region = regionFromCoordinates(allCoords);
    if (Platform.OS === 'android') {
      mapRef.current.animateToRegion(region, 400);
    } else {
      mapRef.current.fitToCoordinates(allCoords, { edgePadding: { top: 24, right: 24, bottom: 24, left: 24 }, animated: true });
    }
  }, [savedMapsLoading, savedMaps]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{plotTitle}</Text>
          {plotMeta ? <Text style={styles.subtitle}>{plotMeta}</Text> : null}
        </View>
      </View>

      {/* Bottom tabs */}
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
        {activeTab === 'plots' && (
          <View style={styles.tabContent}>
            {savedMapsLoading ? (
              <ActivityIndicator size="small" color={T.primary} style={{ marginVertical: 24 }} />
            ) : savedMaps.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyTitle}>No plots marked yet</Text>
                <Text style={styles.emptySub}>Your field officer will add boundary maps here.</Text>
              </View>
            ) : (
              <>
                {/* Map with all plot areas shaded by default */}
                <View style={styles.mapContainer}>
                  <MapView
                    ref={mapRef}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={styles.map}
                    initialRegion={DEFAULT_REGION}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    scrollEnabled
                    zoomEnabled
                  >
                    {savedMaps.map((m) =>
                      m.coordinates && m.coordinates.length >= 3 ? (
                        <Polygon
                          key={m.id}
                          coordinates={[...m.coordinates, m.coordinates[0]]}
                          fillColor="rgba(34,197,94,0.35)"
                          strokeColor={GREEN}
                          strokeWidth={2}
                        />
                      ) : null
                    )}
                  </MapView>
                </View>
                <Text style={styles.summary}>
                  {savedMaps.length} plot(s) · {savedMaps.reduce((a, m) => a + m.area_acres, 0).toFixed(2)} ac total
                </Text>
                {savedMaps.map((m) => (
                  <View key={m.id} style={styles.plotCard}>
                    <View style={styles.plotCardGreenShade}>
                      <View style={styles.plotCardEmojiWrap}>
                        <Text style={styles.plotCardEmoji}>🌽</Text>
                      </View>
                    </View>
                    <View style={styles.plotCardBody}>
                      <Text style={styles.plotCardName}>{m.name}</Text>
                      <Text style={styles.plotCardMeta}>{m.area_acres.toFixed(2)} acres</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'advisory' && (
          <View style={styles.tabContent}>
            <AdvisoryTab
              advisoriesLoading={advisoriesLoading}
              advisories={mappedAdvisories}
              daysSinceSowing={daysSinceSowing}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surface,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    color: T.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: T.text,
  },
  subtitle: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: T.bg,
  },
  tabActive: {
    backgroundColor: T.headerTint,
    borderWidth: 1,
    borderColor: T.primary + '40',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textMuted,
  },
  tabTextActive: {
    color: T.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabContent: {
    minHeight: 200,
  },
  mapContainer: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: T.border,
    marginBottom: 14,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  summary: {
    fontSize: 13,
    color: T.textMuted,
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: T.textMuted,
    textAlign: 'center',
  },
  plotCard: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  plotCardGreenShade: {
    width: 72,
    backgroundColor: T.primary + '22',
    borderRightWidth: 4,
    borderRightColor: T.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenShape: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.primary + '35',
  },
  greenPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plotCardEmojiWrap: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plotCardEmoji: {
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
    includeFontPadding: false,
  },
  plotCardBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  plotCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.text,
  },
  plotCardMeta: {
    fontSize: 13,
    color: T.textMuted,
    marginTop: 4,
  },
});
