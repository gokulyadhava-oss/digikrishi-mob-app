import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import area from '@turf/area';
import { polygon as turfPolygon } from '@turf/helpers';
import { fetchPlotMaps, trackPlotMap, createPlotMap, type PlotMapRecord } from '@/lib/api';
import { GpsKalmanFilter } from '@/utils/gpsKalmanFilter';
import { ErrorBoundary } from '@/components/error-boundary';
import { FARM_MAP_STYLE } from '@/constants/map-style';

const SHEET_BG = '#0A0C0F';
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const EMERALD_BORDER = '#10b981';
const GRAY = '#6B7280';
const GRAY_LIGHT = '#9CA3AF';
const WHITE = '#F9FAFB';
const RED = '#EF4444';
const GOLD = '#FFD700';
const SEND_INTERVAL = 5;
const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 0.01, longitudeDelta: 0.01 };

function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={['rgba(10,12,15,0.97)', SHEET_BG]} style={styles.bottomSheet}>
      <View style={styles.dragHandle} />
      {children}
    </LinearGradient>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillLabel, accent ? { color: accent } : undefined]}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

function getAreaFromPath(path: { latitude: number; longitude: number }[]) {
  if (path.length < 3) return { area_m2: 0, area_acres: 0, area_hectares: 0 };
  const ring = [...path];
  if (ring[0].latitude !== ring[ring.length - 1].latitude || ring[0].longitude !== ring[ring.length - 1].longitude) {
    ring.push(ring[0]);
  }
  const coords = ring.map((p) => [p.longitude, p.latitude]);
  const poly = turfPolygon([coords]);
  const area_m2 = area(poly);
  const area_acres = area_m2 / 4046.86;
  const area_hectares = area_m2 / 10000;
  return { area_m2, area_acres, area_hectares };
}

export default function PlotMapScreen() {
  const { id: plotId, plotTitle = 'Plot', plotMeta = '' } = useLocalSearchParams<{
    id: string;
    plotTitle?: string;
    plotMeta?: string;
  }>();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [activeTab, setActiveTab] = useState<'measure' | 'farms'>('measure');
  const [mode, setMode] = useState<'idle' | 'walking' | 'done' | 'saved'>('idle');
  const [path, setPath] = useState<{ latitude: number; longitude: number; accuracy?: number; timestamp?: number }[]>([]);
  const [savedMaps, setSavedMaps] = useState<PlotMapRecord[]>([]);
  const [savedMapsLoading, setSavedMapsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [countdown, setCountdown] = useState(SEND_INTERVAL);
  const [pointsSent, setPointsSent] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [farmName, setFarmName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const computedArea = path.length >= 3 ? getAreaFromPath(path.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))) : null;

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentIdxRef = useRef(0);
  const pathRef = useRef(path);
  const filterRef = useRef(new GpsKalmanFilter());
  pathRef.current = path;

  const loadSavedMaps = useCallback(async () => {
    if (!plotId) return;
    setSavedMapsLoading(true);
    try {
      const list = await fetchPlotMaps(plotId);
      setSavedMaps(list);
    } catch (e) {
      // ignore
    } finally {
      setSavedMapsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    loadSavedMaps();
  }, [loadSavedMaps]);

  // Center map on user location on load (so not zoomed out to whole India).
  useEffect(() => {
    if (initialLocationSet || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: requested } = await Location.requestForegroundPermissionsAsync();
        if (requested !== 'granted' || cancelled) return;
        status = requested;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });
        if (cancelled || !mapRef.current) return;
        const { latitude, longitude } = loc.coords;
        mapRef.current.animateCamera(
          {
            center: { latitude, longitude },
            zoom: 17,
            heading: 0,
            pitch: 0,
          },
          { duration: 500 }
        );
        setAccuracy(Math.round(loc.coords.accuracy ?? 0));
        setInitialLocationSet(true);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [initialLocationSet]);

  // Fit map to path while walking: first point = center+zoom; 2+ points = fit all with room above sheet.
  useEffect(() => {
    if (mode !== 'walking' || path.length === 0 || !mapRef.current) return;

    if (path.length === 1) {
      mapRef.current.animateCamera(
        {
          center: { latitude: path[0].latitude, longitude: path[0].longitude },
          zoom: 19.5,
          pitch: 10,
          heading: 0,
        },
        { duration: 600 }
      );
      return;
    }

    mapRef.current.fitToCoordinates(
      path.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      {
        edgePadding: { top: 24, right: 40, bottom: 220, left: 40 },
        animated: true,
      }
    );
  }, [mode, path.length, path]);

  const centerOnMe = useCallback(async () => {
    if (!mapRef.current) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: requested } = await Location.requestForegroundPermissionsAsync();
        if (requested !== 'granted') {
          Alert.alert('Permission needed', 'Location is required to centre the map.');
          return;
        }
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });
      if (!mapRef.current) return;
      mapRef.current.animateCamera(
        {
          center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          zoom: 18,
          pitch: 10,
          heading: 0,
        },
        { duration: 500 }
      );
      setAccuracy(Math.round(loc.coords.accuracy ?? 0));
    } catch (_) {
      Alert.alert('Location unavailable', 'Could not get your position.');
    }
  }, []);

  const startWalking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location is required to record the boundary.');
      return;
    }
    filterRef.current.reset();
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
    setPath([]);
    setPointsSent(0);
    setCountdown(SEND_INTERVAL);
    lastSentIdxRef.current = 0;
    setMode('walking');
  }, []);

  useEffect(() => {
    if (mode !== 'walking') return;
    const sub = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: Platform.OS === 'android' ? 0 : 2,
        timeInterval: 1000, // Android: ensure time-based updates (recommended for Kalman)
      },
      (loc) => {
        const acc = loc.coords.accuracy ?? 99;
        setAccuracy(Math.round(acc));
        const smoothed = filterRef.current.process({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          timestamp: Date.now(),
        });
        if (smoothed) {
          setPath((prev) => [...prev, smoothed]);
        }
      }
    );
    sub.then((subscription) => {
      locationSubRef.current = subscription;
    });
    return () => {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'walking' || !sessionId || !plotId) return;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          const currentPath = pathRef.current;
          const current = currentPath.length;
          const from = lastSentIdxRef.current;
          if (current > from && sessionId) {
            const points = currentPath.slice(from);
            lastSentIdxRef.current = current;
            trackPlotMap(plotId, {
              session_id: sessionId,
              points: points.map((p) => ({ latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy, timestamp: p.timestamp })),
            }).then(() => setPointsSent((s) => s + points.length)).catch(() => {});
          }
          return SEND_INTERVAL;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [mode, sessionId, plotId]);

  const stopWalking = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setMode('done');
  }, []);

  const redo = useCallback(() => {
    setPath([]);
    setSessionId(null);
    setCountdown(SEND_INTERVAL);
    setPointsSent(0);
    setMode('idle');
  }, []);

  const viewPlotOnMap = useCallback(
    (m: PlotMapRecord) => {
      if (!mapRef.current || !m.coordinates?.length) return;
      const coords = m.coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 260, left: 40 },
        animated: true,
      });
    },
    []
  );

  const saveMap = useCallback(async () => {
    if (!plotId || path.length < 3 || !computedArea) return;
    setSaveLoading(true);
    try {
      const coords = path.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
      await createPlotMap({
        plot_id: plotId,
        session_id: sessionId ?? undefined,
        name: (farmName && farmName.trim()) || plotTitle || 'Plot map',
        coordinates: coords,
        gps_path: path,
        area_m2: computedArea.area_m2,
        area_acres: computedArea.area_acres,
        area_hectares: computedArea.area_hectares,
      });
      setMode('saved');
      loadSavedMaps();
      setTimeout(() => {
        redo();
        setActiveTab('farms');
      }, 2000);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaveLoading(false);
    }
  }, [plotId, path, computedArea, sessionId, farmName, plotTitle, loadSavedMaps, redo]);

  const pathCoords = path.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  const closedPath = path.length >= 3 ? [...pathCoords, pathCoords[0]] : pathCoords;
  const initialRegion = pathCoords.length
    ? {
        latitude: pathCoords[0].latitude,
        longitude: pathCoords[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  const gpsBadgeColor = accuracy > 30 ? RED : accuracy > 15 ? '#F59E0B' : GREEN;
  const insets = useSafeAreaInsets();

  return (
    <ErrorBoundary
      onRetry={() => router.back()}
      fallback={
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorMessage}>Something went wrong loading the map. Check that location permission is allowed and try again.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      }
    >
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10), paddingBottom: 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.topBarCard}>
          <Text style={styles.topBarEmoji}>🌾</Text>
          <View>
            <Text style={styles.topBarTitle}>Farm Mapper</Text>
            <Text style={styles.topBarSub}>Walk the boundary</Text>
          </View>
        </View>
        <View
          style={[
            styles.gpsBadge,
            {
              backgroundColor: accuracy > 30 ? 'rgba(239,68,68,0.2)' : accuracy > 15 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.15)',
              borderColor: accuracy > 30 ? 'rgba(239,68,68,0.5)' : accuracy > 15 ? 'rgba(245,158,11,0.5)' : 'rgba(34,197,94,0.4)',
            },
          ]}
        >
          <View style={[styles.gpsDot, { backgroundColor: gpsBadgeColor }]} />
          <Text
            style={[styles.gpsText, { color: accuracy > 30 ? '#FCA5A5' : accuracy > 15 ? '#FCD34D' : '#86EFAC' }]}
          >
            GPS ±{accuracy}m
          </Text>
        </View>
      </View>
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          mapType="standard"
          customMapStyle={FARM_MAP_STYLE as any}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          showsPointsOfInterest={false}
          showsCompass={false}
          rotateEnabled
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
        >
        {savedMaps.map((m) => (
          <Polygon
            key={m.id}
            coordinates={m.coordinates.length ? [...m.coordinates, m.coordinates[0]] : []}
            fillColor="rgba(34,197,94,0.2)"
            strokeColor={GREEN}
            strokeWidth={2}
          />
        ))}
        {mode === 'walking' && pathCoords.length > 1 && (
          <Polyline
            coordinates={pathCoords}
            strokeColor={GOLD}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
            geodesic={true}
          />
        )}
        {mode === 'walking' && pathCoords.length >= 2 && (
          <Polyline
            coordinates={[pathCoords[pathCoords.length - 1], pathCoords[0]]}
            strokeColor="rgba(255,215,0,0.5)"
            strokeWidth={2}
            lineDashPattern={[8, 4]}
            geodesic={true}
          />
        )}
        {pathCoords.length >= 1 && (mode === 'walking' || mode === 'done' || mode === 'saved') && (
          <Marker coordinate={pathCoords[0]} pinColor="green" title="Start" />
        )}
        {(mode === 'done' || mode === 'saved') && closedPath.length > 2 && (
          <Polygon coordinates={closedPath} fillColor="rgba(34,197,94,0.22)" strokeColor={GREEN} strokeWidth={3} />
        )}
        </MapView>
        <TouchableOpacity
          style={styles.centreButton}
          onPress={centerOnMe}
          activeOpacity={0.85}
          accessibilityLabel="Centre map on my location"
        >
          <Text style={styles.centreButtonText}>⊙ Centre</Text>
        </TouchableOpacity>
      </View>

      <BottomSheet>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, activeTab === 'measure' && styles.tabActive]} onPress={() => setActiveTab('measure')}>
            <Text style={[styles.tabText, activeTab === 'measure' && styles.tabTextActive]}>📐 Measure</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'farms' && styles.tabActive]} onPress={() => setActiveTab('farms')}>
            <Text style={[styles.tabText, activeTab === 'farms' && styles.tabTextActive]}>🗂 My Farms</Text>
          </Pressable>
        </View>

        {activeTab === 'measure' && (
          <View style={styles.tabContent}>
            {mode === 'idle' && (
              <>
                <Text style={styles.idleText}>
                  Walk along the boundary of your farm.{'\n'}GPS path syncs every 5 seconds.
                </Text>
                <TouchableOpacity activeOpacity={0.9} onPress={startWalking} style={styles.primaryButton}>
                  <LinearGradient colors={[GREEN_DARK, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Text style={styles.primaryButtonText}>🚶 Start Walking</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'walking' && (
              <>
                <View style={styles.statRow}>
                  <StatPill label="Points" value={String(path.length)} accent={GREEN} />
                  <StatPill label="Accuracy" value={`±${accuracy}m`} accent={accuracy <= 15 ? GREEN : '#F59E0B'} />
                </View>
                <View style={[styles.recordingBar]}>
                  <View style={[styles.recordingDot, { backgroundColor: RED }]} />
                  <Text style={styles.recordingText}>Recording boundary • Walk steadily • Next sync in {countdown}s</Text>
                </View>
                <TouchableOpacity activeOpacity={0.9} onPress={stopWalking} style={styles.stopButton}>
                  <LinearGradient colors={['#B91C1C', RED]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.stopButtonGradient]} />
                  <Text style={styles.primaryButtonText}>⏹ Stop & Calculate Area</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'done' && computedArea && (
              <>
                <View style={styles.areaCard}>
                  <Text style={styles.areaLabel}>Total Farm Area</Text>
                  <Text style={styles.areaValue}>
                    {computedArea.area_acres.toFixed(3)}
                    <Text style={styles.areaUnit}> ac</Text>
                  </Text>
                  <Text style={styles.areaMeta}>
                    {computedArea.area_hectares.toFixed(3)} ha · {Math.round(computedArea.area_m2).toLocaleString()} m²
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <StatPill label="Synced pts" value={String(pointsSent)} accent={GREEN} />
                </View>
                <View style={[styles.farmNameInput, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={styles.farmNameEmoji}>🌾</Text>
                  <TextInput
                    placeholder="Name this map (optional)"
                    placeholderTextColor={GRAY_LIGHT}
                    value={farmName}
                    onChangeText={setFarmName}
                    style={styles.farmNameTextInput}
                  />
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={redo}>
                    <Text style={styles.secondaryButtonText}>↩ Redo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveMap} disabled={saveLoading}>
                    <LinearGradient colors={[GREEN_DARK, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.saveButtonGradient]} />
                    {saveLoading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.primaryButtonText}>💾 Save Map</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
            {mode === 'saved' && (
              <View style={styles.savedContent}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.savedTitle}>Map Saved!</Text>
                <Text style={styles.savedSub}>Added to this plot</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'farms' && (
          <View style={styles.tabContent}>
            <Text style={styles.farmsSummary}>
              {savedMapsLoading ? 'Loading…' : `${savedMaps.length} map(s) · ${savedMaps.reduce((a, m) => a + m.area_acres, 0).toFixed(2)} ac total`}
            </Text>
            {savedMaps.length === 0 && !savedMapsLoading && (
              <View style={styles.farmsEmpty}>
                <Text style={styles.farmsEmptyEmoji}>🗺️</Text>
                <Text style={styles.farmsEmptyText}>No maps yet</Text>
                <Text style={styles.farmsEmptySub}>Measure a boundary to get started.</Text>
              </View>
            )}
            {savedMaps.map((m) => (
              <View key={m.id} style={styles.farmRow}>
                <View style={[styles.farmRowIcon, { backgroundColor: `${GREEN}22`, borderColor: `${GREEN}44` }]}>
                  <Text style={styles.farmIconEmoji}>🌾</Text>
                </View>
                <View style={styles.farmInfo}>
                  <Text style={styles.farmName}>{m.name}</Text>
                  <Text style={styles.farmMeta}>{m.area_acres.toFixed(2)} acres</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewPlotButton}
                  onPress={() => viewPlotOnMap(m)}
                  activeOpacity={0.8}
                  accessibilityLabel="View plot on map"
                  accessibilityRole="button">
                  <Text style={styles.viewPlotButtonText}>View plot</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHEET_BG },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: SHEET_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  mapWrapper: { flex: 1 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: SHEET_BG,
  },
  errorTitle: { color: WHITE, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errorMessage: { color: GRAY_LIGHT, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  errorButton: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: GREEN, borderRadius: 12 },
  errorButtonText: { color: WHITE, fontSize: 16, fontWeight: '600' },
  centreButton: {
    position: 'absolute',
    right: 16,
    bottom: 240,
    backgroundColor: 'rgba(10,12,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  centreButtonText: { color: WHITE, fontSize: 14, fontWeight: '600' },
  backButton: { paddingVertical: 6, paddingHorizontal: 4 },
  backButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  topBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,12,15,0.85)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: EMERALD_BORDER,
  },
  topBarEmoji: { fontSize: 16 },
  topBarTitle: { color: 'white', fontSize: 14, fontWeight: '700' },
  topBarSub: { color: GRAY, fontSize: 11 },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  gpsDot: { width: 7, height: 7, borderRadius: 4 },
  gpsText: { color: '#86EFAC', fontSize: 12, fontWeight: '600' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 24,
  },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 4, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { color: GRAY, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: 'white' },
  tabContent: { minHeight: 80 },
  idleText: { color: GRAY_LIGHT, fontSize: 14, textAlign: 'center', marginBottom: 14, lineHeight: 22 },
  primaryButton: { height: 50, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statPillLabel: { color: GRAY, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statPillValue: { color: WHITE, fontSize: 14, fontWeight: '700' },
  recordingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  recordingText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },
  stopButton: { height: 50, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  stopButtonGradient: { borderRadius: 16 },
  areaCard: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: EMERALD_BORDER,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  areaLabel: { color: '#4ADE80', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  areaValue: { color: WHITE, fontSize: 38, fontWeight: '800' },
  areaUnit: { fontSize: 18, color: GRAY, fontWeight: '500', marginLeft: 4 },
  areaMeta: { color: GRAY, fontSize: 13, marginTop: 4 },
  farmNameInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  farmNameEmoji: { fontSize: 16 },
  farmNameTextInput: { flex: 1, color: WHITE, fontSize: 15, padding: 0 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  secondaryButton: { flex: 1, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, alignItems: 'center' },
  secondaryButtonText: { color: GRAY_LIGHT, fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 2, height: 48, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  saveButtonGradient: { borderRadius: 14 },
  savedContent: { alignItems: 'center', paddingVertical: 14 },
  checkCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  checkMark: { color: 'white', fontSize: 26 },
  savedTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  savedSub: { color: GRAY, fontSize: 13 },
  farmsSummary: { color: GRAY, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  farmsEmpty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  farmsEmptyEmoji: { fontSize: 36, marginBottom: 8 },
  farmsEmptyText: { color: WHITE, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  farmsEmptySub: { color: GRAY, fontSize: 13 },
  farmRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: EMERALD_BORDER, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6 },
  farmRowIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  farmIconEmoji: { fontSize: 16 },
  farmInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  farmName: { color: 'white', fontSize: 14, fontWeight: '600' },
  farmMeta: { color: GRAY, fontSize: 12 },
  viewPlotButton: {
    marginLeft: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: `${GREEN}30`,
    borderWidth: 1,
    borderColor: `${GREEN}66`,
  },
  viewPlotButtonText: { color: GREEN, fontSize: 13, fontWeight: '600' },
});
