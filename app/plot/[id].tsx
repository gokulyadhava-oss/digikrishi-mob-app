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
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import area from '@turf/area';
import { polygon as turfPolygon } from '@turf/helpers';
import { fetchPlotMaps, trackPlotMap, createPlotMap, getPlot, updatePlot, type PlotMapRecord } from '@/lib/api';
import { reverseGeocode } from '@/lib/google-places';
import { GpsKalmanFilter } from '@/utils/gpsKalmanFilter';
import { ErrorBoundary } from '@/components/error-boundary';
import { FARM_MAP_STYLE } from '@/constants/map-style';

// ─── Fresh Growth Design Tokens ───────────────────────────────────────────────
const T = {
  primary:       '#3D7A4F',
  primaryLight:  '#5FA870',
  primaryDark:   '#245533',
  secondary:     '#82C341',
  secondaryLight:'#A5DA6B',
  bg:            '#F9FBF7',
  surface:       '#FFFFFF',
  text:          '#1B2A1E',
  textMuted:     '#607060',
  border:        '#E4EDE6',
  headerTint:    '#EDF7EF',
  danger:        '#E05252',
  dangerDark:    '#B91C1C',
};

// ─── Map-only constants — DO NOT CHANGE ──────────────────────────────────────
// These are used exclusively for Polygon / Polyline / Marker on the MapView.
const GREEN       = '#22C55E';
const GREEN_DARK  = '#16A34A';
const GOLD        = '#FFD700';
const RED         = '#EF4444';
const EMERALD_BORDER = '#10b981';  // topBarCard border — kept as original

const SEND_INTERVAL  = 5;
const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 0.004, longitudeDelta: 0.004 };

// ─── BottomSheet ──────────────────────────────────────────────────────────────
const BOTTOM_TABS = [
  { id: 'measure' as const, label: 'Measure' },
  { id: 'farms' as const, label: 'My Farms' },
];

function BottomSheet({
  collapsed,
  onToggle,
  activeTab,
  onTabPress,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: 'measure' | 'farms';
  onTabPress: (tab: 'measure' | 'farms') => void;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return (
      <TouchableOpacity
        style={styles.bottomSheetCollapsed}
        onPress={onToggle}
        activeOpacity={0.9}
        accessibilityLabel="Expand panel"
        accessibilityRole="button">
        <View style={styles.dragHandle} />
        <View style={styles.collapsedRow}>
          <View style={[styles.tabs, { marginBottom: 0, flex: 1 }]}>
            {BOTTOM_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={(e) => {
                  e.stopPropagation();
                  onTabPress(tab.id);
                }}>
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.bottomSheet}>
      <TouchableOpacity style={styles.dragHandleTouch} onPress={onToggle} activeOpacity={0.8} accessibilityLabel="Collapse panel">
        <View style={styles.dragHandle} />
      </TouchableOpacity>
      {children}
    </View>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillLabel, accent ? { color: accent } : undefined]}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

// ─── DrawPointIndicator ───────────────────────────────────────────────────────
function DrawPointIndicator({ nextPoint }: { nextPoint: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (nextPoint > 4) return;
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [nextPoint, pulseAnim]);

  return (
    <View style={styles.drawPointRow}>
      <Text style={styles.drawPointLabel}>Next: </Text>
      {[1, 2, 3, 4].map((n) => {
        const isNext  = n === nextPoint;
        const placed  = n < nextPoint;
        const content = (
          <View style={[
            styles.drawPointPill,
            placed && styles.drawPointPillPlaced,
            isNext && styles.drawPointPillNext,
          ]}>
            <Text style={[styles.drawPointPillText, (placed || isNext) && { color: '#fff' }]}>{n}</Text>
          </View>
        );
        if (isNext) {
          return (
            <Animated.View key={n} style={{ transform: [{ scale: pulseAnim }] }}>
              {content}
            </Animated.View>
          );
        }
        return <View key={n}>{content}</View>;
      })}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAreaFromPath(path: { latitude: number; longitude: number }[]) {
  if (path.length < 3) return { area_m2: 0, area_acres: 0, area_hectares: 0 };
  const ring = [...path];
  if (ring[0].latitude !== ring[ring.length - 1].latitude || ring[0].longitude !== ring[ring.length - 1].longitude) {
    ring.push(ring[0]);
  }
  const coords = ring.map((p) => [p.longitude, p.latitude]);
  const poly   = turfPolygon([coords]);
  const area_m2      = area(poly);
  const area_acres   = area_m2 / 4046.86;
  const area_hectares = area_m2 / 10000;
  return { area_m2, area_acres, area_hectares };
}

function regionFromCoordinates(
  coords: { latitude: number; longitude: number }[],
  paddingFactor = 1.5
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  if (coords.length === 0) return { ...DEFAULT_REGION };
  if (coords.length === 1) {
    return { latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 };
  }
  const lats   = coords.map((c) => c.latitude);
  const lngs   = coords.map((c) => c.longitude);
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlotMapScreen() {
  const { id: plotId, farmerId, plotTitle = 'Plot', plotMeta = '' } = useLocalSearchParams<{
    id: string;
    farmerId?: string;
    plotTitle?: string;
    plotMeta?: string;
  }>();
  const router  = useRouter();
  const mapRef  = useRef<MapView>(null);

  const [activeTab,           setActiveTab]           = useState<'measure' | 'farms'>('measure');
  const [mode,                setMode]                = useState<'idle' | 'walking' | 'drawing' | 'done' | 'saved'>('idle');
  const [path,                setPath]                = useState<{ latitude: number; longitude: number; accuracy?: number; timestamp?: number }[]>([]);
  const [savedMaps,           setSavedMaps]           = useState<PlotMapRecord[]>([]);
  const [savedMapsLoading,    setSavedMapsLoading]    = useState(false);
  const [accuracy,            setAccuracy]            = useState<number>(0);
  const [countdown,           setCountdown]           = useState(SEND_INTERVAL);
  const [pointsSent,          setPointsSent]          = useState(0);
  const [sessionId,           setSessionId]           = useState<string | null>(null);
  const [farmName,            setFarmName]            = useState('');
  const [saveLoading,         setSaveLoading]         = useState(false);
  const [initialLocationSet,  setInitialLocationSet]  = useState(false);

  // ── Default: satellite ────────────────────────────────────────────────────
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');
  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  const computedArea = path.length >= 3
    ? getAreaFromPath(path.map((p) => ({ latitude: p.latitude, longitude: p.longitude })))
    : null;

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentIdxRef = useRef(0);
  const pathRef        = useRef(path);
  const filterRef      = useRef(new GpsKalmanFilter());
  pathRef.current = path;

  // ── Load saved maps ───────────────────────────────────────────────────────
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

  useEffect(() => { loadSavedMaps(); }, [loadSavedMaps]);

  // ── Default on open: zoom in to my location a lot ─────────────────────────
  const INITIAL_ZOOM = 21;
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
        mapRef.current.animateCamera(
          { center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }, zoom: INITIAL_ZOOM, heading: 0, pitch: 0 },
          { duration: 500 }
        );
        setAccuracy(Math.round(loc.coords.accuracy ?? 0));
        setInitialLocationSet(true);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [initialLocationSet]);

  // ── Fit map to path ───────────────────────────────────────────────────────
  useEffect(() => {
    if ((mode !== 'walking' && mode !== 'drawing') || path.length === 0 || !mapRef.current) return;
    if (path.length === 1) {
      mapRef.current.animateCamera(
        { center: { latitude: path[0].latitude, longitude: path[0].longitude }, zoom: 20.5, pitch: 10, heading: 0 },
        { duration: 600 }
      );
      return;
    }
    if (Platform.OS === 'android') {
      const region = regionFromCoordinates(path.map((p) => ({ latitude: p.latitude, longitude: p.longitude })), 1.5);
      mapRef.current.animateToRegion(region, 600);
    } else {
      mapRef.current.fitToCoordinates(
        path.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        { edgePadding: { top: 24, right: 40, bottom: 220, left: 40 }, animated: true }
      );
    }
  }, [mode, path.length, path]);

  // ── Drawing ───────────────────────────────────────────────────────────────
  const startDrawing = useCallback(() => { setPath([]); setMode('drawing'); }, []);

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      if (mode !== 'drawing' || path.length >= 4) return;
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setPath((prev) => [...prev, { latitude, longitude }]);
    },
    [mode, path.length]
  );

  useEffect(() => {
    if (mode === 'drawing' && path.length === 4) setMode('done');
  }, [mode, path.length]);

  const removeLastDrawPoint = useCallback(() => {
    if (mode !== 'drawing' || path.length === 0) return;
    setPath((prev) => prev.slice(0, -1));
  }, [mode, path.length]);

  // ── Centre on me (zoom in a lot) ─────────────────────────────────────────
  const centerOnMe = useCallback(async () => {
    if (!mapRef.current) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: r } = await Location.requestForegroundPermissionsAsync();
        if (r !== 'granted') { Alert.alert('Permission needed', 'Location is required to centre the map.'); return; }
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true });
      if (!mapRef.current) return;
      mapRef.current.animateCamera(
        { center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }, zoom: 21, pitch: 10, heading: 0 },
        { duration: 500 }
      );
      setAccuracy(Math.round(loc.coords.accuracy ?? 0));
    } catch (_) { Alert.alert('Location unavailable', 'Could not get your position.'); }
  }, []);

  // ── Walking ───────────────────────────────────────────────────────────────
  const startWalking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Location is required to record the boundary.'); return; }
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
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: Platform.OS === 'android' ? 0 : 2, timeInterval: 1000 },
      (loc) => {
        setAccuracy(Math.round(loc.coords.accuracy ?? 99));
        const smoothed = filterRef.current.process({
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy:  loc.coords.accuracy ?? null,
          timestamp: Date.now(),
        });
        if (smoothed) setPath((prev) => [...prev, smoothed]);
      }
    );
    sub.then((s) => { locationSubRef.current = s; });
    return () => { locationSubRef.current?.remove(); locationSubRef.current = null; };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'walking' || !sessionId || !plotId) return;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          const currentPath = pathRef.current;
          const current = currentPath.length;
          const from    = lastSentIdxRef.current;
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
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [mode, sessionId, plotId]);

  const stopWalking = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setMode('done');
  }, []);

  const redo = useCallback(() => {
    // Defer state reset so we're not clearing path/mode during map render (avoids native crash when removing Polygon)
    setTimeout(() => {
      filterRef.current.reset();
      lastSentIdxRef.current = 0;
      setPath([]);
      setSessionId(null);
      setCountdown(SEND_INTERVAL);
      setPointsSent(0);
      setMode('idle');
    }, 0);
  }, []);

  // ── View plot on map ──────────────────────────────────────────────────────
  const viewPlotOnMap = useCallback((m: PlotMapRecord) => {
    if (!mapRef.current || !m.coordinates?.length) return;
    const coords = m.coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
    if (Platform.OS === 'android') {
      mapRef.current.animateToRegion(regionFromCoordinates(coords, 1.6), 600);
    } else {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, right: 40, bottom: 260, left: 40 }, animated: true });
    }
  }, []);

  // ── Save map ──────────────────────────────────────────────────────────────
  const saveMap = useCallback(async () => {
    if (!plotId || path.length < 3 || !computedArea) return;
    setSaveLoading(true);
    const firstLat = path[0].latitude;
    const firstLng = path[0].longitude;
    try {
      const coords = path.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
      await createPlotMap({
        plot_id:        plotId,
        session_id:     sessionId ?? undefined,
        name:           (farmName && farmName.trim()) || plotTitle || 'Plot map',
        coordinates:    coords,
        gps_path:       path.length > 0 ? coords : undefined,
        area_m2:        computedArea.area_m2,
        area_acres:     computedArea.area_acres,
        area_hectares:  computedArea.area_hectares,
      });
      setMode('saved');
      loadSavedMaps();

      if (farmerId && path.length > 0) {
        (async () => {
          try {
            const plot = await getPlot(farmerId, plotId);
            const hasAddress = !!(plot.address?.trim() || plot.district?.trim());
            if (!hasAddress) {
              const parsed = await reverseGeocode(firstLat, firstLng);
              await updatePlot(farmerId, plotId, {
                address:  parsed.address  || null,
                pincode:  parsed.pincode  || null,
                taluka:   parsed.taluka   || null,
                district: parsed.district || null,
              });
            }
          } catch (_) { /* ignore backfill failure */ }
        })();
      }

      setTimeout(() => { redo(); setActiveTab('farms'); }, 2000);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaveLoading(false);
    }
  }, [plotId, farmerId, path, computedArea, sessionId, farmName, plotTitle, loadSavedMaps, redo]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const pathCoords    = path.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  const closedPath    = path.length >= 3 ? [...pathCoords, pathCoords[0]] : pathCoords;
  const initialRegion = pathCoords.length
    ? { latitude: pathCoords[0].latitude, longitude: pathCoords[0].longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }
    : DEFAULT_REGION;

  const gpsBadgeColor  = accuracy > 30 ? T.danger : accuracy > 15 ? '#F59E0B' : T.primary;
  const gpsBadgeBg     = accuracy > 30 ? 'rgba(239,68,68,0.1)' : accuracy > 15 ? 'rgba(245,158,11,0.1)' : `${T.primary}18`;
  const gpsBadgeBorder = accuracy > 30 ? 'rgba(239,68,68,0.35)' : accuracy > 15 ? 'rgba(245,158,11,0.35)' : `${T.primary}44`;
  const gpsTextColor   = accuracy > 30 ? T.danger : accuracy > 15 ? '#D97706' : T.primary;

  return (
    <ErrorBoundary
      onRetry={() => router.back()}
      fallback={
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorMessage}>
            Something went wrong loading the map. Check that location permission is allowed and try again.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.container}>

        {/* ══ Header ══════════════════════════════════════════════════════════ */}
        <View style={[styles.header, { paddingTop: 10, paddingBottom: 8 }]}>
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

          <View style={[styles.gpsBadge, { backgroundColor: gpsBadgeBg, borderColor: gpsBadgeBorder }]}>
            <View style={[styles.gpsDot, { backgroundColor: gpsBadgeColor }]} />
            <Text style={[styles.gpsText, { color: gpsTextColor }]}>GPS ±{accuracy}m</Text>
          </View>
        </View>

        {/* ══ Map ═════════════════════════════════════════════════════════════ */}
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            mapType={mapType}
            customMapStyle={mapType === 'standard' ? (FARM_MAP_STYLE as any) : undefined}
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
            onPress={mode === 'drawing' ? handleMapPress : undefined}
          >
            {/* ── Saved polygons — only render when enough points (empty coords can crash native map) ── */}
            {savedMaps.map((m) =>
              m.coordinates && m.coordinates.length >= 3 ? (
                <Polygon
                  key={m.id}
                  coordinates={[...m.coordinates, m.coordinates[0]]}
                  fillColor="rgba(34,197,94,0.2)"
                  strokeColor={GREEN}
                  strokeWidth={2}
                />
              ) : null
            )}
            {/* ── Walking polylines — UNCHANGED ── */}
            {mode === 'walking' && pathCoords.length > 1 && (
              <Polyline coordinates={pathCoords} strokeColor={GOLD} strokeWidth={4} lineJoin="round" lineCap="round" geodesic />
            )}
            {mode === 'walking' && pathCoords.length >= 2 && (
              <Polyline
                coordinates={[pathCoords[pathCoords.length - 1], pathCoords[0]]}
                strokeColor="rgba(255,215,0,0.5)"
                strokeWidth={2}
                lineDashPattern={[8, 4]}
                geodesic
              />
            )}
            {/* ── Drawing markers — UNCHANGED ── */}
            {(mode === 'drawing' || mode === 'done' || mode === 'saved') && pathCoords.length >= 1 && pathCoords.map((coord, idx) => (
              <Marker key={idx} coordinate={coord} pinColor={GREEN} title={`${idx + 1}`} />
            ))}
            {mode === 'drawing' && pathCoords.length >= 2 && (
              <>
                <Polyline coordinates={pathCoords} strokeColor={GOLD} strokeWidth={4} lineJoin="round" lineCap="round" geodesic />
                <Polyline
                  coordinates={[pathCoords[pathCoords.length - 1], pathCoords[0]]}
                  strokeColor="rgba(255,215,0,0.8)"
                  strokeWidth={3}
                  lineDashPattern={[10, 6]}
                  lineJoin="round"
                  lineCap="round"
                  geodesic
                />
              </>
            )}
            {pathCoords.length >= 1 && mode === 'walking' && (
              <Marker coordinate={pathCoords[0]} pinColor="green" title="Start" />
            )}
            {(mode === 'done' || mode === 'saved') && closedPath.length >= 3 && (
              <Polygon coordinates={closedPath} fillColor="rgba(34,197,94,0.22)" strokeColor={GREEN} strokeWidth={3} />
            )}
          </MapView>

          {/* Map overlay buttons */}
          <TouchableOpacity
            style={styles.mapTypeButton}
            onPress={() => setMapType((t) => (t === 'standard' ? 'satellite' : 'standard'))}
            activeOpacity={0.85}
            accessibilityLabel={mapType === 'standard' ? 'Switch to satellite view' : 'Switch to map view'}
          >
            <Text style={styles.mapTypeButtonLabel}>
              {mapType === 'standard' ? '🛰  Satellite' : ' 🗺  Map view'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.centreButton}
            onPress={centerOnMe}
            activeOpacity={0.85}
            accessibilityLabel="Centre map on my location"
          >
            <AntDesign name="aim" size={20} color={T.primary} style={{ marginRight: 6 }} />
            <Text style={styles.centreButtonText}>Centre</Text>
          </TouchableOpacity>
        </View>

        {/* ══ Bottom Sheet ════════════════════════════════════════════════════ */}
        <BottomSheet
          collapsed={sheetCollapsed}
          onToggle={() => setSheetCollapsed((c) => !c)}
          activeTab={activeTab}
          onTabPress={setActiveTab}>
          <View style={styles.tabs}>
            {BOTTOM_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}>
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Measure Tab ── */}
          {activeTab === 'measure' && (
            <View style={styles.tabContent}>

              {mode === 'idle' && (
                <>
                  <Text style={styles.idleText}>Walk the boundary or tap Draw to place 4 corners.</Text>
                  <View style={styles.idleButtonRow}>
                    <TouchableOpacity activeOpacity={0.9} onPress={startWalking} style={styles.primaryButton}>
                      <FontAwesome6 name="person-walking-arrow-right" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Start Walking</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.9} onPress={startDrawing} style={styles.drawPlotButton}>
                      <AntDesign name="edit" size={18} color={T.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.drawPlotButtonText}>Draw plot</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {mode === 'drawing' && (
                <>
                  <Text style={styles.drawingText}>Tap the map to place 4 corners.</Text>
                  <DrawPointIndicator nextPoint={path.length + 1} />
                  {path.length > 0 && (
                    <TouchableOpacity activeOpacity={0.9} onPress={removeLastDrawPoint} style={styles.secondaryButtonOutline}>
                      <AntDesign name="undo" size={16} color={T.textMuted} style={{ marginRight: 6 }} />
                      <Text style={styles.secondaryButtonText}>Remove last point</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {mode === 'walking' && (
                <>
                  <View style={styles.statRow}>
                    <StatPill label="Points"   value={String(path.length)} accent={T.primary} />
                    <StatPill label="Accuracy" value={`±${accuracy}m`}    accent={accuracy <= 15 ? T.primary : '#D97706'} />
                  </View>
                  <View style={styles.recordingBar}>
                    <View style={[styles.recordingDot, { backgroundColor: T.danger }]} />
                    <Text style={styles.recordingText}>
                      Recording boundary • Walk steadily • Next sync in {countdown}s
                    </Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.9} onPress={stopWalking} style={styles.stopButton}>
                    <AntDesign name="pause-circle" size={20} color={T.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.stopButtonText}>Stop & Calculate Area</Text>
                  </TouchableOpacity>
                </>
              )}

              {mode === 'done' && computedArea && (
                <>
                  <View style={styles.areaCard}>
                    <Text style={styles.areaLabel}>TOTAL FARM AREA</Text>
                    <Text style={styles.areaValue}>
                      {computedArea.area_acres.toFixed(3)}
                      <Text style={styles.areaUnit}> ac</Text>
                    </Text>
                    <Text style={styles.areaMeta}>
                      {computedArea.area_hectares.toFixed(3)} ha · {Math.round(computedArea.area_m2).toLocaleString()} m²
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    {sessionId
                      ? <StatPill label="Synced pts" value={String(pointsSent)} accent={T.primary} />
                      : <StatPill label="Points"     value={String(path.length)} accent={T.primary} />
                    }
                  </View>
                  <View style={styles.farmNameInput}>
                    <Text style={styles.farmNameEmoji}>🌾</Text>
                    <TextInput
                      placeholder="Name this map (optional)"
                      placeholderTextColor={T.textMuted + '99'}
                      value={farmName}
                      onChangeText={setFarmName}
                      style={styles.farmNameTextInput}
                    />
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={redo}>
                      <AntDesign name="undo" size={16} color={T.textMuted} style={{ marginRight: 6 }} />
                      <Text style={styles.secondaryButtonText}>Redo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveMap} disabled={saveLoading}>
                      {saveLoading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : (
                          <>
                            <AntDesign name="save" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryButtonText}>Save Map</Text>
                          </>
                        )
                      }
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

          {/* ── Farms Tab ── */}
          {activeTab === 'farms' && (
            <View style={styles.tabContent}>
              <Text style={styles.farmsSummary}>
                {savedMapsLoading
                  ? 'Loading…'
                  : `${savedMaps.length} map(s) · ${savedMaps.reduce((a, m) => a + m.area_acres, 0).toFixed(2)} ac total`}
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
                  <View style={styles.farmRowIcon}>
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
                    accessibilityRole="button"
                  >
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Error
  errorContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: T.bg },
  errorTitle:      { color: T.text,     fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errorMessage:    { color: T.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  errorButton:     { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: T.primary, borderRadius: 12 },
  errorButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton:     { paddingVertical: 6, paddingHorizontal: 4 },
  backButtonText: { color: T.primary, fontSize: 15, fontWeight: '600' },

  topBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.headerTint,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: EMERALD_BORDER,
  },
  topBarEmoji: { fontSize: 16 },
  topBarTitle: { color: T.text,     fontSize: 14, fontWeight: '700' },
  topBarSub:   { color: T.textMuted, fontSize: 11 },

  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  gpsDot:  { width: 7, height: 7, borderRadius: 4 },
  gpsText: { fontSize: 12, fontWeight: '600' },

  // Map
  mapWrapper: { flex: 1 },

  mapTypeButton: {
    position: 'absolute',
    left: 16,
    bottom: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  mapTypeButtonLabel: { color: T.text, fontSize: 14, fontWeight: '600' },

  centreButton: {
    position: 'absolute',
    right: 16,
    bottom: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  centreButtonText: { color: T.text, fontSize: 14, fontWeight: '600' },

  // Bottom Sheet — white/light surface
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
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 24,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  dragHandleTouch: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 4,
  },
  bottomSheetCollapsed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 24,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  tab:           { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 9 },
  tabActive:     { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tabText:       { color: T.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: T.primary,   fontSize: 13, fontWeight: '700' },
  tabContent:    { minHeight: 80 },

  // Idle
  idleText:      { color: T.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 14, lineHeight: 22 },
  idleButtonRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },

  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.primary,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  drawPlotButton: {
    flexDirection: 'row',
    minWidth: 128,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.headerTint,
    borderWidth: 1.5,
    borderColor: T.primary,
  },
  drawPlotButtonText: { color: T.primary, fontSize: 15, fontWeight: '700' },

  // Drawing
  drawingText:    { color: T.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  drawPointRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  drawPointLabel: { color: T.textMuted, fontSize: 14, fontWeight: '600' },
  drawPointPill: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 2, borderColor: T.border,
    justifyContent: 'center', alignItems: 'center',
  },
  drawPointPillPlaced: { backgroundColor: T.primary,     borderColor: T.primary },
  drawPointPillNext:   { backgroundColor: T.primaryLight, borderColor: T.primaryDark },
  drawPointPillText:   { color: T.textMuted, fontSize: 18, fontWeight: '800' },

  secondaryButtonOutline: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Walking
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statPill: {
    flex: 1,
    backgroundColor: T.headerTint,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statPillLabel: { color: T.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statPillValue: { color: T.text,      fontSize: 14, fontWeight: '700' },

  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  recordingDot:  { width: 8, height: 8, borderRadius: 4 },
  recordingText: { color: T.danger, fontSize: 12, fontWeight: '600' },

  stopButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  stopButtonText: { color: T.danger, fontSize: 16, fontWeight: '700' },

  // Area card
  areaCard: {
    backgroundColor: T.headerTint,
    borderWidth: 1,
    borderColor: T.primary + '55',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  areaLabel: { color: T.primary,   fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  areaValue: { color: T.text,      fontSize: 38, fontWeight: '800' },
  areaUnit:  { fontSize: 18,        color: T.textMuted, fontWeight: '500', marginLeft: 4 },
  areaMeta:  { color: T.textMuted,  fontSize: 13, marginTop: 4 },

  farmNameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  farmNameEmoji:     { fontSize: 16 },
  farmNameTextInput: { flex: 1, color: T.text, fontSize: 15, padding: 0 },

  buttonRow: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { color: T.textMuted, fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.primary,
  },

  // Saved
  savedContent: { alignItems: 'center', paddingVertical: 14 },
  checkCircle:  { width: 56, height: 56, borderRadius: 28, backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  checkMark:    { color: '#fff', fontSize: 26 },
  savedTitle:   { color: T.text,      fontSize: 17, fontWeight: '700', marginBottom: 2 },
  savedSub:     { color: T.textMuted, fontSize: 13 },

  // Farms tab
  farmsSummary:    { color: T.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  farmsEmpty:      { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  farmsEmptyEmoji: { fontSize: 36, marginBottom: 8 },
  farmsEmptyText:  { color: T.text,      fontSize: 15, fontWeight: '600', marginBottom: 2 },
  farmsEmptySub:   { color: T.textMuted, fontSize: 13 },

  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  farmRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.headerTint,
    borderWidth: 1, borderColor: T.border,
    justifyContent: 'center', alignItems: 'center',
  },
  farmIconEmoji: { fontSize: 16 },
  farmInfo:      { flex: 1, marginLeft: 12, minWidth: 0 },
  farmName:      { color: T.text,      fontSize: 14, fontWeight: '600' },
  farmMeta:      { color: T.textMuted, fontSize: 12 },

  viewPlotButton: {
    marginLeft: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: T.headerTint,
    borderWidth: 1,
    borderColor: T.primary + '55',
  },
  viewPlotButtonText: { color: T.primary, fontSize: 13, fontWeight: '600' },
});

