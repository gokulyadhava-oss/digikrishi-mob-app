import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchPlotMaps,
  fetchMyPlotAdvisories,
  fetchPlotAdvisories,
  type PlotMapRecord,
  type PlotAdvisoriesResponse,
  type CropAdvisoryRecord,
} from '@/lib/api';
import { ErrorBoundary } from '@/components/error-boundary';
import { FARM_MAP_STYLE } from '@/constants/map-style';

const SHEET_BG = '#0A0C0F';
const GREEN = '#22C55E';
const EMERALD_BORDER = '#10b981';
const GRAY = '#6B7280';
const GRAY_LIGHT = '#9CA3AF';
const WHITE = '#F9FAFB';
const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 0.01, longitudeDelta: 0.01 };

function regionFromCoordinates(
  coords: { latitude: number; longitude: number }[],
  paddingFactor = 1.6
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  if (coords.length === 0) return { ...DEFAULT_REGION };
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

function formatStep(step: unknown, index: number): string {
  if (step == null) return `${index + 1}. —`;
  if (typeof step === 'string') return `${index + 1}. ${step}`;
  if (typeof step === 'object' && step !== null && 'step' in (step as object)) {
    return `${index + 1}. ${(step as { step?: string }).step ?? String(step)}`;
  }
  return `${index + 1}. ${JSON.stringify(step)}`;
}

function formatSpecLabel(key: string): string {
  const k = (key || '').trim();
  if (!k) return 'Details';
  if (k.toLowerCase() === 'text') return 'Details';
  if (/^\d+$/.test(k)) return `Point ${k}`;
  return k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
}

function splitIntoParagraphs(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Normalize steps from API: can be array of items or object like { text: "1. ...\n2. ..." }. */
function getStepsList(steps: unknown): string[] {
  if (Array.isArray(steps)) {
    return steps.map((s) => {
      if (s == null) return '';
      if (typeof s === 'string') return s;
      if (typeof s === 'object' && s !== null && 'step' in (s as object))
        return (s as { step?: string }).step ?? String(s);
      return String(s);
    });
  }
  if (steps && typeof steps === 'object' && !Array.isArray(steps)) {
    const obj = steps as Record<string, unknown>;
    const text = (obj.text ?? obj.steps ?? obj.content ?? '').toString().trim();
    if (!text) return [];
    return splitIntoParagraphs(text);
  }
  if (typeof steps === 'string' && steps.trim()) {
    return splitIntoParagraphs(steps);
  }
  return [];
}

export default function PlotViewScreen() {
  const { user } = useAuth();
  const { id: plotId, farmerId, plotTitle = 'Plot', plotMeta = '' } = useLocalSearchParams<{
    id: string;
    farmerId?: string;
    plotTitle?: string;
    plotMeta?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [savedMaps, setSavedMaps] = useState<PlotMapRecord[]>([]);
  const [savedMapsLoading, setSavedMapsLoading] = useState(false);
  const [advisoriesData, setAdvisoriesData] = useState<PlotAdvisoriesResponse | null>(null);
  const [advisoriesLoading, setAdvisoriesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMaps = useCallback(async () => {
    if (!plotId) return;
    setSavedMapsLoading(true);
    try {
      const list = await fetchPlotMaps(plotId);
      setSavedMaps(list);
    } catch {
      setSavedMaps([]);
    } finally {
      setSavedMapsLoading(false);
    }
  }, [plotId]);

  const loadAdvisories = useCallback(async () => {
    if (!plotId) return;
    const isFarmer = user?.role === 'FARMER';
    if (!isFarmer && !farmerId) return;
    setAdvisoriesLoading(true);
    try {
      const data = isFarmer
        ? await fetchMyPlotAdvisories(plotId)
        : await fetchPlotAdvisories(farmerId!, plotId);
      setAdvisoriesData(data);
    } catch {
      setAdvisoriesData({ days_since_sowing: null, advisories: [] });
    } finally {
      setAdvisoriesLoading(false);
    }
  }, [plotId, user?.role, farmerId]);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  useEffect(() => {
    loadAdvisories();
  }, [loadAdvisories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadMaps(), loadAdvisories()]);
    setRefreshing(false);
  }, [loadMaps, loadAdvisories]);

  const firstMap = savedMaps[0];
  const mapRegion =
    firstMap?.coordinates?.length >= 2
      ? regionFromCoordinates(firstMap.coordinates)
      : DEFAULT_REGION;

  const filteredAdvisories = advisoriesData?.advisories
    ? (() => {
        const seen = new Set<string>();
        return advisoriesData.advisories.filter((a) => {
          const activityLower = (a.activity || '').toLowerCase();
          if (
            activityLower.includes('rate of the yield') ||
            activityLower.includes('rate of yield') ||
            activityLower.includes('yield per acre')
          )
            return false;
          const key = `${a.stage_name}|${a.activity}|${a.start_day ?? ''}|${a.end_day ?? ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      })()
    : [];

  return (
    <ErrorBoundary
      onRetry={() => router.back()}
      fallback={
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load plot</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      }>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10), paddingBottom: 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.titleText} numberOfLines={1}>{plotTitle}</Text>
            {plotMeta ? (
              <Text style={styles.metaText} numberOfLines={1}>{plotMeta}</Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
          }
          showsVerticalScrollIndicator={false}>
          {firstMap && firstMap.coordinates?.length >= 2 && (
            <View style={styles.mapSection}>
              <Text style={styles.sectionLabel}>View plot</Text>
              <View style={styles.mapWrapper}>
                <MapView
                  ref={mapRef}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  customMapStyle={FARM_MAP_STYLE as any}
                  style={styles.map}
                  initialRegion={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}>
                  <Polygon
                    coordinates={
                      firstMap.coordinates.length
                        ? [...firstMap.coordinates, firstMap.coordinates[0]]
                        : []
                    }
                    fillColor="rgba(34,197,94,0.2)"
                    strokeColor={GREEN}
                    strokeWidth={2}
                  />
                </MapView>
              </View>
              <Text style={styles.mapArea}>
                {firstMap.area_acres != null
                  ? `${firstMap.area_acres.toFixed(2)} acres`
                  : ''}
              </Text>
            </View>
          )}

          <View style={styles.advisoriesSection}>
            <Text style={styles.sectionLabel}>Advisories</Text>
            {advisoriesLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={GREEN} />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            )}
            {!advisoriesLoading && advisoriesData && (
              <>
                <View style={styles.daysRow}>
                  <Text style={styles.daysText}>
                    {advisoriesData.days_since_sowing != null
                      ? `${advisoriesData.days_since_sowing} days since sowing`
                      : 'Set sowing date on this plot to see day-based advisories'}
                  </Text>
                </View>
                {filteredAdvisories.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📋</Text>
                    <Text style={styles.emptyTitle}>No advisories for this period</Text>
                    <Text style={styles.emptySub}>
                      Advisories depend on crop, season, variety and days since sowing.
                    </Text>
                  </View>
                ) : (
                  <>
                    {filteredAdvisories.filter((a) => a.is_current_period).map((a) => (
                      <View key={a.id} style={styles.currentCardWrap}>
                        <AdvisoryStepperStep
                          stepNumber={1}
                          totalSteps={1}
                          advisory={a}
                          variant="current"
                        />
                      </View>
                    ))}
                    <EarlierAdvisoriesAccordion
                      advisories={filteredAdvisories.filter((a) => !a.is_current_period)}
                    />
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

function EarlierAdvisoriesAccordion({ advisories }: { advisories: CropAdvisoryRecord[] }) {
  const byRange = useMemo(() => {
    const map = new Map<string, CropAdvisoryRecord[]>();
    for (const a of advisories) {
      const key =
        a.start_day != null && a.end_day != null
          ? `Day ${a.start_day} – ${a.end_day}`
          : 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [advisories]);

  const rangeLabels = useMemo(
    () =>
      Array.from(byRange.keys()).sort((a, b) => {
        const aNum = byRange.get(a)?.[0]?.start_day ?? -1;
        const bNum = byRange.get(b)?.[0]?.start_day ?? -1;
        return bNum - aNum;
      }),
    [byRange]
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && rangeLabels.length > 0) {
      didInit.current = true;
      setExpanded(new Set([rangeLabels[0]]));
    }
  }, [rangeLabels]);

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (advisories.length === 0) return null;

  return (
    <View style={styles.earlierSection}>
      <Text style={styles.earlierLabel}>Earlier advisories</Text>
      <Text style={styles.earlierSub}>Tap a date range to expand</Text>
      {rangeLabels.map((label) => {
        const isOpen = expanded.has(label);
        return (
          <View key={label} style={styles.earlierRangeGroup}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggle(label)}
              activeOpacity={0.7}
            >
              <Text style={styles.earlierRangeLabel}>{label}</Text>
              <Text style={styles.accordionChevron}>{isOpen ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {isOpen &&
              byRange.get(label)!.map((a) => (
                <AdvisoryPastCard key={a.id} advisory={a} />
              ))}
          </View>
        );
      })}
    </View>
  );
}

function AdvisoryStepperStep({
  stepNumber,
  totalSteps,
  advisory,
  variant = 'current',
}: {
  stepNumber: number;
  totalSteps: number;
  advisory: CropAdvisoryRecord;
  variant?: 'current';
}) {
  const isLast = stepNumber === totalSteps;
  const isCurrent = variant === 'current';
  const specs = advisory.specifications && typeof advisory.specifications === 'object'
    ? advisory.specifications
    : null;
  const stepsList = getStepsList(advisory.steps);
  const hasSpecs = specs && Object.keys(specs).length > 0;
  const hasSteps = stepsList.length > 0;

  const hideStepLabel = isCurrent && totalSteps === 1;

  return (
    <View style={styles.stepperRow}>
      {!hideStepLabel && (
        <View style={styles.stepperLeft}>
          <View style={styles.stepperCircle}>
            <Text style={styles.stepperNumber}>{stepNumber}</Text>
          </View>
          {!isLast && <View style={styles.stepperLine} />}
        </View>
      )}
      <View style={[styles.stepperCard, hideStepLabel && styles.stepperCardFullWidth]}>
        <View style={styles.stepperCardInner}>
          {hideStepLabel && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
          {!hideStepLabel && (
            <Text style={styles.stepperStepLabel}>Step {stepNumber}</Text>
          )}
          <Text style={styles.cardStage}>{advisory.stage_name}</Text>
          <Text style={styles.cardActivity}>{advisory.activity}</Text>
          {(advisory.activity_type || advisory.activity_time) && (
            <Text style={styles.cardMeta}>
              {[advisory.activity_type, advisory.activity_time].filter(Boolean).join(' · ')}
            </Text>
          )}
          {advisory.start_day != null && advisory.end_day != null && (
            <Text style={styles.cardPeriod}>
              Day {advisory.start_day} – {advisory.end_day}
            </Text>
          )}

          {hasSpecs && (
            <View style={styles.specsBlock}>
              <Text style={styles.specsTitle}>Specifications</Text>
              {Object.entries(specs!).map(([key, value], specIndex) => {
                const label = formatSpecLabel(key);
                const strVal = String(value ?? '').trim();
                const paragraphs = splitIntoParagraphs(strVal);
                const pointNum = specIndex + 1;
                return (
                  <View key={key} style={styles.pointRow}>
                    <Text style={styles.pointNum}>{pointNum}.</Text>
                    <View style={styles.pointContent}>
                      <Text style={styles.pointLabel}>{label}</Text>
                      {paragraphs.length > 0 ? (
                        paragraphs.map((para, i) => (
                          <Text key={i} style={styles.pointValue}>
                            {para}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.pointValue}>{strVal || '—'}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {hasSteps && (
            <View style={styles.stepsBlock}>
              <Text style={styles.stepsTitle}>Steps</Text>
              {stepsList.map((stepText, i) => (
                <View key={i} style={styles.pointRow}>
                  <Text style={styles.pointNum}>{i + 1}.</Text>
                  <Text style={styles.stepPointText}>
                    {stepText.replace(/^\d+\.\s*/, '').trim() || stepText}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function AdvisoryPastCard({ advisory }: { advisory: CropAdvisoryRecord }) {
  const specs = advisory.specifications && typeof advisory.specifications === 'object'
    ? advisory.specifications
    : null;
  const stepsList = getStepsList(advisory.steps);
  const hasSpecs = specs && Object.keys(specs).length > 0;
  const hasSteps = stepsList.length > 0;

  return (
    <View style={styles.pastCard}>
      <Text style={styles.pastCardStage}>{advisory.stage_name}</Text>
      <Text style={styles.pastCardActivity}>{advisory.activity}</Text>
      {(advisory.activity_type || advisory.activity_time) && (
        <Text style={styles.pastCardMeta}>
          {[advisory.activity_type, advisory.activity_time].filter(Boolean).join(' · ')}
        </Text>
      )}
      {advisory.start_day != null && advisory.end_day != null && (
        <Text style={styles.pastCardPeriod}>Day {advisory.start_day} – {advisory.end_day}</Text>
      )}
      {hasSpecs && (
        <View style={styles.pastSpecsBlock}>
          <Text style={styles.pastBlockTitle}>Specifications</Text>
          {Object.entries(specs!).map(([key, value], specIndex) => {
            const label = formatSpecLabel(key);
            const strVal = String(value ?? '').trim();
            const paragraphs = splitIntoParagraphs(strVal);
            return (
              <View key={key} style={styles.pastPointRow}>
                <Text style={styles.pastPointNum}>{specIndex + 1}.</Text>
                <View style={styles.pastPointContent}>
                  <Text style={styles.pastPointLabel}>{label}</Text>
                  {paragraphs.length > 0
                    ? paragraphs.map((para, i) => (
                        <Text key={i} style={styles.pastPointValue}>{para}</Text>
                      ))
                    : (
                        <Text style={styles.pastPointValue}>{strVal || '—'}</Text>
                      )}
                </View>
              </View>
            );
          })}
        </View>
      )}
      {hasSteps && (
        <View style={styles.pastStepsBlock}>
          <Text style={styles.pastBlockTitle}>Steps</Text>
          {stepsList.map((stepText, i) => (
            <View key={i} style={styles.pastPointRow}>
              <Text style={styles.pastPointNum}>{i + 1}.</Text>
              <Text style={styles.pastPointValue}>
                {stepText.replace(/^\d+\.\s*/, '').trim() || stepText}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHEET_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: SHEET_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: { paddingVertical: 6, paddingHorizontal: 4 },
  backButtonText: { color: WHITE, fontSize: 15, fontWeight: '600' },
  titleWrap: { flex: 1, minWidth: 0 },
  titleText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  metaText: { color: GRAY, fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  mapSection: { marginBottom: 20 },
  sectionLabel: {
    color: GRAY_LIGHT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  mapWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  map: { width: '100%', height: '100%' },
  mapArea: { color: GRAY, fontSize: 12, marginTop: 6 },
  advisoriesSection: { marginBottom: 24 },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: { color: GRAY_LIGHT, fontSize: 14 },
  daysRow: { marginBottom: 12 },
  daysText: { color: '#4ADE80', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: WHITE, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySub: { color: GRAY, fontSize: 13, textAlign: 'center' },
  stepperList: { paddingLeft: 4 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  stepperLeft: {
    width: 32,
    alignItems: 'center',
  },
  stepperCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperNumber: {
    color: SHEET_BG,
    fontSize: 14,
    fontWeight: '800',
  },
  stepperLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 6,
    backgroundColor: 'rgba(34,197,94,0.5)',
    borderRadius: 1,
  },
  stepperCard: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginBottom: 8,
  },
  stepperCardFullWidth: { marginLeft: 0 },
  stepperCardInner: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  stepperStepLabel: {
    color: GRAY_LIGHT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardStage: { color: GREEN, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 },
  cardActivity: { color: WHITE, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  cardMeta: { color: GRAY, fontSize: 12, marginBottom: 4 },
  cardPeriod: { color: GRAY_LIGHT, fontSize: 11, marginBottom: 12 },
  specsBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  specsTitle: { color: GRAY_LIGHT, fontSize: 11, fontWeight: '700', marginBottom: 10 },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 8,
  },
  pointNum: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 20,
  },
  pointContent: { flex: 1, minWidth: 0 },
  pointLabel: { color: GRAY, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  pointValue: { color: WHITE, fontSize: 13, lineHeight: 22, marginBottom: 6 },
  stepsBlock: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  stepsTitle: { color: GRAY_LIGHT, fontSize: 11, fontWeight: '700', marginBottom: 10 },
  stepPointText: { color: WHITE, fontSize: 13, lineHeight: 22, flex: 1 },
  currentCardWrap: { marginBottom: 20, paddingLeft: 4 },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  currentBadgeText: { color: SHEET_BG, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  earlierSection: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  earlierLabel: { color: GRAY_LIGHT, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  earlierSub: { color: GRAY, fontSize: 11, marginBottom: 14 },
  earlierRangeGroup: { marginBottom: 16 },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  earlierRangeLabel: {
    color: GRAY_LIGHT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  accordionChevron: { color: GRAY_LIGHT, fontSize: 10, fontWeight: '700' },
  pastCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  pastCardStage: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  pastCardActivity: { color: '#d1d5db', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  pastCardMeta: { color: '#6b7280', fontSize: 11, marginBottom: 2 },
  pastCardPeriod: { color: '#6b7280', fontSize: 10, marginBottom: 10 },
  pastSpecsBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  pastStepsBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  pastBlockTitle: { color: '#6b7280', fontSize: 10, fontWeight: '700', marginBottom: 8 },
  pastPointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 6 },
  pastPointNum: { color: '#9ca3af', fontSize: 12, fontWeight: '700', minWidth: 18 },
  pastPointContent: { flex: 1, minWidth: 0 },
  pastPointLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  pastPointValue: { color: '#d1d5db', fontSize: 12, lineHeight: 20 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: SHEET_BG,
  },
  errorTitle: { color: WHITE, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  errorButton: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: GREEN, borderRadius: 12 },
  errorButtonText: { color: WHITE, fontSize: 16, fontWeight: '600' },
});
