import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  fetchFarmer,
  getProfileDownloadUrl,
  deleteProfile,
  uploadProfileImage,
  getDocumentDownloadUrl,
  deleteDocument,
  uploadDocument,
  fetchPlots,
  createPlot,
  deletePlot,
  DOC_TYPES,
  DOC_TYPE_TO_KEY,
  type Farmer,
  type FarmerPlotRecord,
  type FarmerPlotPayload,
} from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlotFormModal } from '@/components/plot-form-modal';

// ─── Token aliases ─────────────────────────────────────────────────────────────
const T = {
  primary:      '#3D7A4F',
  primaryLight: '#5FA870',
  primaryDark:  '#245533',
  secondary:    '#82C341',
  bg:           '#F9FBF7',
  surface:      '#FFFFFF',
  text:         '#1B2A1E',
  textMuted:    '#607060',
  border:       '#E4EDE6',
  headerTint:   '#EDF7EF',   // very subtle green for section headers
  danger:       '#E05252',
};

const DOC_LABELS: Record<string, string> = {
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  shg_byelaws: 'SHG bye-laws',
  extract_7_12: 'Land Documents',
  consent_letter: 'Consent letter',
  bank_doc: 'Bank document',
  other: 'Other',
};

// ─── InfoCard ─────────────────────────────────────────────────────────────────
function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof ICON_MAP;
  children: React.ReactNode;
}) {
  const mciName = ICON_MAP[icon] ?? 'circle-outline';
  return (
    <View style={S.infoCard}>
      {/* Subtle green tinted header */}
      <View style={S.infoCardHeader}>
        <MaterialCommunityIcons name={mciName} size={15} color={T.primary} />
        <Text style={S.infoCardTitle}>{title}</Text>
      </View>
      <View style={S.infoCardBody}>{children}</View>
    </View>
  );
}

const ICON_MAP = {
  'person.fill':       'account-circle-outline',
  'mappin.circle.fill':'map-marker-outline',
  'person.3.fill':     'account-group',
  'banknote.fill':     'cash',
  'doc.fill':          'file-document-outline',
} as const;

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      <Text style={S.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FarmerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [farmer,               setFarmer]               = useState<Farmer | null>(null);
  const [loading,              setLoading]               = useState(true);
  const [refreshing,           setRefreshing]            = useState(false);
  const [previewUrl,           setPreviewUrl]            = useState<string | null>(null);
  const [profileImageUrl,      setProfileImageUrl]       = useState<string | null>(null);
  const [profileActionLoading, setProfileActionLoading]  = useState(false);
  const [docActionLoading,     setDocActionLoading]      = useState<string | null>(null);
  const [activeTab,            setActiveTab]             = useState<'basics'|'documents'|'plot'>('basics');
  const [plots,                setPlots]                 = useState<FarmerPlotRecord[]>([]);
  const [plotsLoading,         setPlotsLoading]          = useState(false);
  const [plotFormVisible,      setPlotFormVisible]       = useState(false);

  const screenWidth  = Dimensions.get('window').width;
  const TAB_WIDTH    = (screenWidth - 32 - 8) / 3;   // card margins + inner pad
  const tabAnim      = useRef(new Animated.Value(0)).current;

  const handleTabPress = useCallback((key: 'basics'|'documents'|'plot', index: number) => {
    setActiveTab(key);
    Animated.spring(tabAnim, {
      toValue: index * TAB_WIDTH,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [TAB_WIDTH, tabAnim]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const f = await fetchFarmer(id);
      setFarmer(f);
      setProfileImageUrl(null);
      if (f.profile_pic_url) {
        try { const { url } = await getProfileDownloadUrl(id); setProfileImageUrl(url); } catch {}
      }
    } catch { setFarmer(null); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    if (id && activeTab === 'plot') loadPlots();
  };

  const loadPlots = useCallback(async () => {
    if (!id) return;
    setPlotsLoading(true);
    try { const list = await fetchPlots(id); setPlots(list); }
    catch { setPlots([]); }
    finally { setPlotsLoading(false); }
  }, [id]);

  useEffect(() => { if (id && activeTab === 'plot') loadPlots(); }, [id, activeTab, loadPlots]);

  const handleSavePlot = async (payload: FarmerPlotPayload) => {
    if (!id) return;
    await createPlot(id, payload);
    await loadPlots();
  };

  const handleDeletePlot = (plot: FarmerPlotRecord) => {
    if (!id) return;
    Alert.alert('Delete plot', `Remove ${plot.season ?? '—'} / ${plot.variety ?? '—'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deletePlot(id, plot.id); await loadPlots(); }
        catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
      }},
    ]);
  };

  const handleDeleteProfile = () => {
    if (!id) return;
    Alert.alert('Remove profile picture', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setProfileActionLoading(true);
        try {
          await deleteProfile(id);
          setProfileImageUrl(null);
          setFarmer(prev => prev ? { ...prev, profile_pic_url: null } : null);
        } catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
        finally { setProfileActionLoading(false); }
      }},
    ]);
  };

  const uploadProfileImageFromUri = async (uri: string) => {
    if (!id) return;
    setProfileActionLoading(true);
    try {
      const res = await uploadProfileImage(id, { uri, type: 'image/jpeg', name: 'profile.jpg' }, true);
      const { url } = await getProfileDownloadUrl(id);
      setProfileImageUrl(url);
      setFarmer(prev => prev && res.profile_pic_url ? { ...prev, profile_pic_url: res.profile_pic_url } : prev);
    } catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed'); }
    finally { setProfileActionLoading(false); }
  };

  const handleReuploadProfile = () => {
    if (!id) return;
    Alert.alert('Profile picture', 'Choose source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Gallery', onPress: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to photos.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) await uploadProfileImageFromUri(result.assets[0].uri);
      }},
      { text: 'Camera', onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) await uploadProfileImageFromUri(result.assets[0].uri);
      }},
    ]);
  };

  const hasDoc = (docType: string) => {
    const key = DOC_TYPE_TO_KEY[docType];
    const docs = farmer?.FarmerDoc;
    return Boolean(key && docs && (docs as Record<string, unknown>)[key]);
  };

  const openDoc = async (docType: string) => {
    if (!id) return;
    setDocActionLoading(docType);
    try { const { url } = await getDocumentDownloadUrl(id, docType); await WebBrowser.openBrowserAsync(url); }
    catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Could not open'); }
    finally { setDocActionLoading(null); }
  };

  const handleDeleteDoc = (docType: string) => {
    if (!id) return;
    Alert.alert(`Delete ${DOC_LABELS[docType] ?? docType}`, 'Remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDocActionLoading(docType);
        try { await deleteDocument(id, docType); await load(); }
        catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
        finally { setDocActionLoading(null); }
      }},
    ]);
  };

  const handleReuploadDoc = async (docType: string) => {
    if (!id) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    setDocActionLoading(docType);
    try { await uploadDocument(id, docType, { uri: file.uri, type: file.mimeType ?? 'application/pdf', name: file.name ?? `${docType}.pdf` }); await load(); }
    catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed'); }
    finally { setDocActionLoading(null); }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading && !farmer) {
    return (
      <View style={[S.centered, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }
  if (!farmer) {
    return (
      <View style={[S.centered, { backgroundColor: T.bg }]}>
        <Text style={{ color: T.text, fontSize: 14 }}>Farmer not found</Text>
      </View>
    );
  }

  const addr    = farmer.FarmerAddress;
  const profile = farmer.FarmerProfileDetail;
  const bank    = farmer.FarmerBank;
  const docs    = farmer.FarmerDoc;

  const tabs = [
    { key: 'basics'    as const, label: 'Basics'    },
    { key: 'documents' as const, label: 'Documents' },
    { key: 'plot'      as const, label: 'Plot'      },
  ];

  return (
    <View style={[S.root, { backgroundColor: T.bg }]}>

      {/* ── Inline header ─────────────────────────────────────────────────── */}
      <View style={[S.inlineHeader, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Farmer</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      >

        {/* ── Hero row: avatar left + name/code/badge right ─────────────── */}
        <View style={S.heroRow}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={handleReuploadProfile}
            onLongPress={farmer.profile_pic_url ? handleDeleteProfile : undefined}
            disabled={profileActionLoading}
            activeOpacity={0.85}
            style={S.avatarWrap}
          >
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={S.avatar} resizeMode="cover" />
            ) : (
              <View style={S.avatarPlaceholder}>
                <MaterialCommunityIcons name="account-circle-outline" size={40} color={T.primary} />
              </View>
            )}
            {/* Camera badge */}
            <View style={S.cameraBadge}>
              {profileActionLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <MaterialCommunityIcons name="camera-outline" size={13} color="#fff" />
              }
            </View>
          </TouchableOpacity>

          {/* Name + code + status */}
          <View style={S.heroInfo}>
            <Text style={S.heroName} numberOfLines={2}>{farmer.name}</Text>
            <Text style={S.heroCode}>{farmer.farmer_code}</Text>
            <View style={[
              S.statusChip,
              { backgroundColor: farmer.is_activated ? T.primary + '18' : '#F0F0F0',
                borderColor:      farmer.is_activated ? T.primary + '40' : '#DDD' }
            ]}>
              <View style={[S.statusDot, { backgroundColor: farmer.is_activated ? T.secondary : '#AAA' }]} />
              <Text style={[S.statusText, { color: farmer.is_activated ? T.primary : T.textMuted }]}>
                {farmer.is_activated ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <View style={S.tabCard}>
          <View style={[S.tabBar, { backgroundColor: T.bg }]}>
            <Animated.View style={[S.tabIndicator, { width: TAB_WIDTH - 6, transform: [{ translateX: tabAnim }] }]} />
            {tabs.map(({ key, label }, index) => (
              <TouchableOpacity
                key={key}
                style={[S.tabItem, { width: TAB_WIDTH }]}
                onPress={() => handleTabPress(key, index)}
                activeOpacity={0.7}
              >
                <Text style={[S.tabLabel, activeTab === key && S.tabLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── BASICS ──────────────────────────────────────────────────── */}
          {activeTab === 'basics' && (
            <View style={S.tabContent}>
              <InfoCard title="Personal" icon="person.fill">
                <Row label="Farmer Code" value={farmer.farmer_code ?? '—'} />
                <Row label="Name"        value={farmer.name ?? '—'} />
                <Row label="Mobile"      value={farmer.mobile ?? '—'} />
                <Row label="Aadhaar"     value={docs?.aadhaar_number ?? '—'} />
                <Row label="PAN"         value={docs?.pan_number ?? '—'} />
                <Row label="Ration Card" value={profile?.ration_card === true ? 'Available' : 'Not available'} />
              </InfoCard>
              <InfoCard title="Address" icon="mappin.circle.fill">
                <Row label="Village"  value={addr?.village  ?? '—'} />
                <Row label="Taluka"   value={addr?.taluka   ?? '—'} />
                <Row label="District" value={addr?.district ?? '—'} />
              </InfoCard>
              <InfoCard title="Associations" icon="person.3.fill">
                <Row label="FPC" value={profile?.fpc ?? '—'} />
                <Row label="SHG" value={profile?.shg ?? '—'} />
              </InfoCard>
              <InfoCard title="Bank" icon="banknote.fill">
                <Row label="Bank Name"   value={bank?.bank_name      ?? '—'} />
                <Row label="IFSC"        value={bank?.ifsc_code       ?? '—'} />
                <Row label="Account No." value={bank?.account_number  ?? '—'} />
                <Row label="Verification" value={bank?.verified === true ? 'Verified ✓' : 'Not verified'} />
              </InfoCard>
            </View>
          )}

          {/* ── DOCUMENTS ───────────────────────────────────────────────── */}
          {activeTab === 'documents' && (
            <View style={S.tabContent}>
              <InfoCard title="Documents" icon="doc.fill">
                {DOC_TYPES.map((docType, idx) => {
                  const has     = hasDoc(docType);
                  const busy    = docActionLoading === docType;
                  const isLast  = idx === DOC_TYPES.length - 1;
                  return (
                    <View key={docType} style={[S.docRow, !isLast && { borderBottomWidth: 1, borderBottomColor: T.border }]}>
                      <View style={S.docRowLeft}>
                        <MaterialCommunityIcons
                          name={has ? 'file-check-outline' : 'file-document-outline'}
                          size={18}
                          color={has ? T.primary : T.textMuted}
                        />
                        <Text style={[S.docLabel, { color: has ? T.text : T.textMuted }]} numberOfLines={1}>
                          {DOC_LABELS[docType] ?? docType}
                        </Text>
                      </View>
                      <View style={S.docRowActions}>
                        {has ? (
                          <>
                            <TouchableOpacity onPress={() => openDoc(docType)} disabled={busy} style={S.docIconBtn}>
                              <MaterialCommunityIcons name="eye-outline" size={20} color={T.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleReuploadDoc(docType)} disabled={busy} style={S.docIconBtn}>
                              {busy
                                ? <ActivityIndicator size="small" color={T.primary} />
                                : <MaterialCommunityIcons name="refresh" size={20} color={T.primary} />
                              }
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteDoc(docType)} disabled={busy} style={S.docIconBtn}>
                              <MaterialCommunityIcons name="delete-outline" size={20} color={T.danger} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleReuploadDoc(docType)}
                            disabled={busy}
                            style={S.uploadChip}
                          >
                            {busy
                              ? <ActivityIndicator size="small" color={T.primary} />
                              : <>
                                  <MaterialCommunityIcons name="upload-outline" size={13} color={T.primary} />
                                  <Text style={S.uploadChipText}>Upload</Text>
                                </>
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </InfoCard>
            </View>
          )}

          {/* ── PLOT ────────────────────────────────────────────────────── */}
          {activeTab === 'plot' && (
            <View style={S.tabContent}>
              {/* Add plot button */}
              <TouchableOpacity
                style={S.addPlotBtn}
                onPress={() => setPlotFormVisible(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={T.primary} />
                <Text style={S.addPlotBtnText}>Add plot</Text>
              </TouchableOpacity>

              {plotsLoading ? (
                <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 24 }} />
              ) : plots.length === 0 ? (
                <View style={S.plotEmpty}>
                  <MaterialCommunityIcons name="sprout" size={36} color={T.border} />
                  <Text style={S.plotEmptyText}>No plots yet</Text>
                  <Text style={S.plotEmptySubtext}>Tap "Add plot" to record the first one</Text>
                </View>
              ) : (
                <View style={S.plotList}>
                  {plots.map((plot) => {
                    const season  = plot.season ?? '—';
                    const variety = plot.variety ?? '—';
                    const size    = plot.land_size_value != null
                      ? `${plot.land_size_value} ${plot.units ?? ''}`.trim()
                      : null;
                    const loc     = [plot.taluka, plot.district].filter(Boolean).join(', ');
                    const plotTitle = `${season} · ${variety}`;
                    const plotMeta  = [size, loc].filter(Boolean).join(' · ');

                    const goToPlot = () => router.push({
                      pathname: '/plot/[id]',
                      params: { id: plot.id, farmerId: String(id), plotTitle, plotMeta },
                    });

                    return (
                      <TouchableOpacity
                        key={plot.id}
                        style={S.plotChip}
                        onPress={goToPlot}
                        activeOpacity={0.85}
                      >
                        {/* Left green accent */}
                        <View style={S.plotChipAccent} />

                        <View style={S.plotChipBody}>
                          {/* Top row: title + delete */}
                          <View style={S.plotChipTopRow}>
                            <Text style={S.plotChipTitle} numberOfLines={1}>{plotTitle}</Text>
                            <TouchableOpacity
                              onPress={() => handleDeletePlot(plot)}
                              style={S.plotDeleteBtn}
                              hitSlop={8}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={16} color={T.danger} />
                            </TouchableOpacity>
                          </View>

                          {/* Meta chips row */}
                          <View style={S.plotChipMeta}>
                            {size && (
                              <View style={S.metaChip}>
                                <MaterialCommunityIcons name="terrain" size={11} color={T.primary} />
                                <Text style={S.metaChipText}>{size}</Text>
                              </View>
                            )}
                            {loc ? (
                              <View style={S.metaChip}>
                                <MaterialCommunityIcons name="map-marker-outline" size={11} color={T.primary} />
                                <Text style={S.metaChipText}>{loc}</Text>
                              </View>
                            ) : null}
                            {plot.sowing_date && (
                              <View style={S.metaChip}>
                                <MaterialCommunityIcons name="calendar-outline" size={11} color={T.primary} />
                                <Text style={S.metaChipText}>{plot.sowing_date}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Arrow */}
                        <MaterialCommunityIcons name="chevron-right" size={18} color={T.border} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <PlotFormModal
        visible={plotFormVisible}
        onClose={() => setPlotFormVisible(false)}
        onSave={handleSavePlot}
      />

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <Pressable style={S.previewOverlay} onPress={() => setPreviewUrl(null)}>
          <View style={S.previewContent}>
            {previewUrl && (
              <Image source={{ uri: previewUrl }} style={S.previewImage} resizeMode="contain" />
            )}
            <TouchableOpacity style={S.previewClose} onPress={() => setPreviewUrl(null)}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:    { flex: 1 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: T.text },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // ── Hero row ──
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: T.border,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: T.headerTint,
    borderWidth: 2,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.surface,
  },
  heroInfo:   { flex: 1, gap: 3 },
  heroName:   { fontSize: 17, fontWeight: '800', color: T.text, lineHeight: 22 },
  heroCode:   { fontSize: 12, color: T.textMuted, fontFamily: 'monospace' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    marginTop: 2,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // ── Tab card ──
  tabCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 9,
    backgroundColor: T.surface,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabItem:  { paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 12, fontWeight: '400', color: T.textMuted },
  tabLabelActive: { fontWeight: '700', color: T.primary },

  tabContent: { padding: 12, gap: 10 },

  // ── InfoCard ──
  infoCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: T.headerTint,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  infoCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: T.primary,
  },
  infoCardBody: { paddingHorizontal: 12, paddingVertical: 4 },

  // ── Row ──
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: T.border + '80',
    gap: 8,
  },
  rowLabel: { fontSize: 12, color: T.textMuted, flex: 0 },
  rowValue: { fontSize: 12, fontWeight: '600', color: T.text, flex: 1, textAlign: 'right' },

  // ── Documents ──
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 8,
  },
  docRowLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  docLabel:      { fontSize: 13, fontWeight: '500', flex: 1 },
  docRowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docIconBtn:    { padding: 6 },
  uploadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: T.primary + '50',
    backgroundColor: T.headerTint,
  },
  uploadChipText: { fontSize: 12, fontWeight: '600', color: T.primary },

  // ── Plot ──
  addPlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: T.primary + '60',
    backgroundColor: T.headerTint,
  },
  addPlotBtnText: { fontSize: 13, fontWeight: '700', color: T.primary },

  plotEmpty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  plotEmptyText:    { fontSize: 14, fontWeight: '600', color: T.textMuted },
  plotEmptySubtext: { fontSize: 12, color: T.textMuted, textAlign: 'center' },

  plotList: { gap: 8 },
  plotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  plotChipAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: T.secondary,
  },
  plotChipBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
  plotChipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plotChipTitle:  { fontSize: 13, fontWeight: '700', color: T.text, flex: 1 },
  plotDeleteBtn:  { padding: 2 },
  plotChipMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: T.headerTint,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  metaChipText: { fontSize: 10, color: T.textMuted, fontWeight: '500' },

  // ── Preview modal ──
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContent: { width: '100%', maxHeight: '90%', alignItems: 'center' },
  previewImage:   { width: '100%', height: 400, marginBottom: 16 },
  previewClose: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
});