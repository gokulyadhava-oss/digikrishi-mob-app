import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
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
import { IconSymbol } from '@/components/ui/icon-symbol';
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
import { LinearGradient } from 'expo-linear-gradient';

const DOC_LABELS: Record<string, string> = {
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  shg_byelaws: 'SHG bye-laws',
  extract_7_12: 'Land Documents',
  consent_letter: 'Consent letter',
  bank_doc: 'Bank document',
  other: 'Other',
};

export default function FarmerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileActionLoading, setProfileActionLoading] = useState(false);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basics' | 'documents' | 'plot'>('basics');
  const [plots, setPlots] = useState<FarmerPlotRecord[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotFormVisible, setPlotFormVisible] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const docDividerColor = colorScheme === 'dark' ? 'rgba(250,250,250,0.22)' : 'rgba(26,26,26,0.14)';
  const docButtonBorderColor = colorScheme === 'dark' ? 'rgba(250,250,250,0.45)' : 'rgba(26,26,26,0.3)';

  const screenWidth = Dimensions.get('window').width;
  const scrollPadding = 12;
  const innerPadding = 12;
  const contentWidth = screenWidth - scrollPadding * 2 - innerPadding * 2;
  const TAB_WIDTH = contentWidth / 3;
  const tabAnim = useRef(new Animated.Value(0)).current;

  const handleTabPress = useCallback((key: 'basics' | 'documents' | 'plot', index: number) => {
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
        try {
          const { url } = await getProfileDownloadUrl(id);
          setProfileImageUrl(url);
        } catch {
          // keep placeholder
        }
      }
    } catch {
      setFarmer(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    if (id && activeTab === 'plot') loadPlots();
  };

  const loadPlots = useCallback(async () => {
    if (!id) return;
    setPlotsLoading(true);
    try {
      const list = await fetchPlots(id);
      setPlots(list);
    } catch {
      setPlots([]);
    } finally {
      setPlotsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'plot') loadPlots();
  }, [id, activeTab, loadPlots]);

  const handleSavePlot = async (payload: FarmerPlotPayload) => {
    if (!id) return;
    await createPlot(id, payload);
    await loadPlots();
  };

  const handleDeletePlot = (plot: FarmerPlotRecord) => {
    if (!id) return;
    Alert.alert('Delete plot', `Remove this plot (${plot.season ?? '—'} / ${plot.variety ?? '—'})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlot(id, plot.id);
            await loadPlots();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleDeleteProfile = () => {
    if (!id) return;
    Alert.alert('Delete profile picture', 'Remove this profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setProfileActionLoading(true);
          try {
            await deleteProfile(id);
            setProfileImageUrl(null);
            setFarmer((prev) => (prev ? { ...prev, profile_pic_url: null } : null));
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
          } finally {
            setProfileActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReuploadProfile = async () => {
    if (!id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to choose a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setProfileActionLoading(true);
    try {
      const res = await uploadProfileImage(id, {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      }, true);
      const { url } = await getProfileDownloadUrl(id);
      setProfileImageUrl(url);
      setFarmer((prev) => (prev && res.profile_pic_url ? { ...prev, profile_pic_url: res.profile_pic_url } : prev));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setProfileActionLoading(false);
    }
  };

  const hasDoc = (docType: string): boolean => {
    const key = DOC_TYPE_TO_KEY[docType];
    const docs = farmer?.FarmerDoc;
    return Boolean(key && docs && (docs as Record<string, unknown>)[key]);
  };

  const openDoc = async (docType: string) => {
    if (!id) return;
    setDocActionLoading(docType);
    try {
      const { url } = await getDocumentDownloadUrl(id, docType);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open document');
    } finally {
      setDocActionLoading(null);
    }
  };

  const handleDeleteDoc = (docType: string) => {
    if (!id) return;
    Alert.alert(`Delete ${DOC_LABELS[docType] || docType}`, 'Remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDocActionLoading(docType);
          try {
            await deleteDocument(id, docType);
            await load();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
          } finally {
            setDocActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleReuploadDoc = async (docType: string) => {
    if (!id) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setDocActionLoading(docType);
    try {
      await uploadDocument(id, docType, {
        uri: file.uri,
        type: file.mimeType ?? 'application/pdf',
        name: file.name ?? `${docType}.pdf`,
      });
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setDocActionLoading(null);
    }
  };

  if (loading && !farmer) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!farmer) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={[styles.error, { color: colors.text }]}>
          Farmer not found
        </ThemedText>
      </ThemedView>
    );
  }

  const addr = farmer.FarmerAddress;
  const profile = farmer.FarmerProfileDetail;
  const bank = farmer.FarmerBank;
  const docs = farmer.FarmerDoc;

  const tabs = [
    { key: 'basics' as const, label: 'Basics Details' },
    { key: 'documents' as const, label: 'Documents' },
    { key: 'plot' as const, label: 'Plot' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        <ThemedText type="title" style={styles.name}>
          {farmer.name}
        </ThemedText>
        <ThemedText style={[styles.code, { color: colors.text, opacity: 0.9 }]}>
          {farmer.farmer_code}
        </ThemedText>
        <View style={[styles.badges, { marginTop: 12 }]}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: farmer.is_activated ? colors.primary : colors.muted,
              },
            ]}>
            <ThemedText style={styles.badgeText}>
              {farmer.is_activated ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
      
        </View>

        <View style={[styles.baseCard, { overflow: 'hidden', borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: colors.emeraldBorder ?? colors.cardBorder }]}>
          <LinearGradient
            colors={[Colors.cardHeaderGreen.gradientStart, Colors.cardHeaderGreen.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.baseCardInner}>
            <TouchableOpacity
              style={styles.imageWrap}
              onPress={handleReuploadProfile}
              onLongPress={farmer.profile_pic_url ? handleDeleteProfile : undefined}
              disabled={profileActionLoading}
              activeOpacity={0.85}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.profilePlaceholder,
                    { backgroundColor: colors.muted },
                  ]}>
                  <IconSymbol name="person.fill" size={80} color={colors.background} />
                </View>
              )}
              {profileActionLoading ? (
                <View style={styles.profileArrowOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <View style={styles.profileArrowOverlay}>
                  <IconSymbol name="arrow.up.circle.fill" size={36} color="rgba(255,255,255,0.95)" />
                </View>
              )}
            </TouchableOpacity>

            <View style={[styles.tabBar, { backgroundColor: colors.muted, borderRadius: 14 }]}>
              <Animated.View
            style={{
              position: 'absolute',
              width: TAB_WIDTH - 6,
              top: 3,
              bottom: 3,
              left: 3,
              borderRadius: 11,
              backgroundColor: colors.card,
              transform: [{ translateX: tabAnim }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          />
          {tabs.map(({ key, label }, index) => (
            <TouchableOpacity
              key={key}
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}
              onPress={() => handleTabPress(key, index)}
              activeOpacity={0.7}>
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: activeTab === key ? '700' : '400',
                  color: colors.text,
                  opacity: activeTab === key ? 1 : 0.88,
                }}>
                {label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'basics' && (
          <View style={{ width: '100%', gap: 10, marginTop: 12 }}>
            <InfoCard title="Personal" icon="person.fill" colors={colors}>
              <Row label="Farmer Code" value={farmer.farmer_code ?? '—'} colors={colors} />
              <Row label="Name" value={farmer.name ?? '—'} colors={colors} />
              <Row label="Mobile" value={farmer.mobile ?? '—'} colors={colors} />
              <Row label="Aadhaar" value={docs?.aadhaar_number ?? '—'} colors={colors} />
              <Row label="PAN" value={docs?.pan_number ?? '—'} colors={colors} />
              <Row
                label="Ration Card"
                value={profile?.ration_card === true ? 'Available' : 'Not available'}
                colors={colors}
              />
            </InfoCard>
            <InfoCard title="Address" icon="mappin.circle.fill" colors={colors}>
              <Row label="Village" value={addr?.village ?? '—'} colors={colors} />
              <Row label="Taluka" value={addr?.taluka ?? '—'} colors={colors} />
              <Row label="District" value={addr?.district ?? '—'} colors={colors} />
            </InfoCard>
            <InfoCard title="Associations" icon="person.3.fill" colors={colors}>
              <Row label="FPC" value={profile?.fpc ?? '—'} colors={colors} />
              <Row label="SHG" value={profile?.shg ?? '—'} colors={colors} />
            </InfoCard>
            <InfoCard title="Bank" icon="banknote.fill" colors={colors}>
              <Row label="Bank Name" value={bank?.bank_name ?? '—'} colors={colors} />
              <Row label="IFSC" value={bank?.ifsc_code ?? '—'} colors={colors} />
              <Row label="Account No." value={bank?.account_number ?? '—'} colors={colors} />
              <Row
                label="Verification"
                value={bank?.verified === true ? 'Verified ✓' : 'Not verified'}
                colors={colors}
              />
            </InfoCard>
          </View>
        )}

        {activeTab === 'documents' && (
          <View style={{ width: '100%', marginTop: 12 }}>
            <InfoCard title="Documents" icon="doc.fill" colors={colors}>
              {DOC_TYPES.map((docType, idx) => {
                const has = hasDoc(docType);
                const loading = docActionLoading === docType;
                const isLast = idx === DOC_TYPES.length - 1;
                return (
                  <View
                    key={docType}
                    style={[
                      styles.docRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: docDividerColor },
                    ]}>
                    <View style={styles.docRowLeft}>
                      <IconSymbol
                        name="doc.fill"
                        size={20}
                        color={colors.text}
                      />
                      <ThemedText
                        style={[styles.docRowLabel, { color: colors.text }]}
                        numberOfLines={1}>
                        {DOC_LABELS[docType] ?? docType}
                      </ThemedText>
                    </View>
                    <View style={styles.docRowActions}>
                      {has ? (
                        <>
                          <TouchableOpacity
                            onPress={() => openDoc(docType)}
                            disabled={loading}
                            style={styles.docRowIconBtn}
                            accessibilityLabel="View document">
                            <IconSymbol name="eye.fill" size={22} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleReuploadDoc(docType)}
                            disabled={loading}
                            style={styles.docRowIconBtn}
                            accessibilityLabel="Replace document">
                            {loading ? (
                              <ActivityIndicator size="small" color={colors.text} />
                            ) : (
                              <IconSymbol name="arrow.triangle.2.circlepath" size={22} color={colors.text} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteDoc(docType)}
                            disabled={loading}
                            style={styles.docRowIconBtn}
                            accessibilityLabel="Remove document">
                            <IconSymbol name="trash.fill" size={22} color={colors.destructive} />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleReuploadDoc(docType)}
                          disabled={loading}
                          style={[styles.docUploadBtn, { borderWidth: 1.5, borderColor: docButtonBorderColor, backgroundColor: 'transparent' }]}>
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.text} />
                          ) : (
                            <ThemedText style={[styles.docUploadBtnText, { color: colors.text }]}>Upload</ThemedText>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </InfoCard>
          </View>
        )}

        {activeTab === 'plot' && (
          <View style={[styles.plotTab, { marginTop: 12 }]}>
            {plotsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.plotLoader} />
            ) : plots.length === 0 ? (
              <TouchableOpacity
                style={[styles.addPlotCard, { borderColor: colors.primary, backgroundColor: colors.card }]}
                onPress={() => setPlotFormVisible(true)}
                activeOpacity={0.8}>
                <IconSymbol name="plus.circle.fill" size={56} color={colors.text} />
                <ThemedText type="subtitle" style={[styles.addPlotTitle, { color: colors.text }]}>Add Plot</ThemedText>
                <ThemedText style={[styles.addPlotSub, { color: colors.text, opacity: 0.9 }]}>
                  Tap to add season, variety, land & address
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.addPlotCardSmall, { borderColor: colors.primary }]}
                  onPress={() => setPlotFormVisible(true)}
                  activeOpacity={0.8}>
                  <IconSymbol name="plus.circle.fill" size={32} color={colors.text} />
                  <ThemedText style={[styles.addPlotTitleSmall, { color: colors.text }]}>Add another plot</ThemedText>
                </TouchableOpacity>
                {plots.map((plot) => {
                  const plotTitle = [plot.season, plot.variety].filter(Boolean).join(' · ') || 'Plot';
                  const plotMeta = [plot.land_size_value != null && `${plot.land_size_value} ${plot.units ?? ''}`.trim(), plot.taluka, plot.district].filter(Boolean).join(' · ') || '—';
                  const goToPlot = () => router.push({ pathname: '/plot/[id]', params: { id: plot.id, farmerId: String(id), plotTitle, plotMeta } });
                  return (
                    <View key={plot.id} style={[styles.plotCard, { borderColor: colors.emeraldBorder ?? colors.cardBorder ?? colors.border }]}>
                      <TouchableOpacity activeOpacity={0.9} onPress={goToPlot}>
                        <Image
                          source={{ uri: 'https://568a6n8a8z.ucarecd.net/53e42c26-a358-4ae0-bfec-75f3b96e13a4/-/preview/1000x666/' }}
                          style={styles.plotCardCover}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <View style={styles.plotCardContent}>
                        <TouchableOpacity style={styles.plotCardBodyTouch} activeOpacity={0.9} onPress={goToPlot}>
                          <View style={styles.plotCardBody}>
                            <ThemedText type="subtitle" style={styles.plotCardTitle}>
                              {plotTitle}
                            </ThemedText>
                            <ThemedText style={[styles.plotCardMeta, { color: colors.text, opacity: 0.9 }]}>
                              {plotMeta}
                            </ThemedText>
                            {plot.sowing_date ? (
                              <ThemedText style={[styles.plotCardMeta, { color: colors.text, opacity: 0.9 }]}>
                                Sowing: {plot.sowing_date}
                              </ThemedText>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeletePlot(plot)}
                          style={[styles.plotCardDelete, { borderColor: colors.destructive }]}>
                          <ThemedText style={[styles.plotCardDeleteText, { color: colors.destructive }]}>Delete</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
          </View>
        </View>
      </ScrollView>

      <PlotFormModal
        visible={plotFormVisible}
        onClose={() => setPlotFormVisible(false)}
        onSave={handleSavePlot}
      />

      <Modal
        visible={!!previewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}>
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewUrl(null)}>
          <View style={styles.previewContent}>
            {previewUrl ? (
              <Image
                source={{ uri: previewUrl }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={[styles.previewClose, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setPreviewUrl(null)}>
              <ThemedText style={styles.previewCloseText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string };
}) {
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, { color: colors.text, opacity: 0.9 }]}>
        {label}
      </ThemedText>
      <ThemedText style={styles.rowValue} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

function InfoCard({
  title,
  icon,
  colors,
  children,
}: {
  title: string;
  icon: 'person.fill' | 'mappin.circle.fill' | 'person.3.fill' | 'banknote.fill' | 'doc.fill';
  colors: { card: string; border: string; muted: string; primary: string; mutedForeground: string; emeraldBorder?: string; cardBorder?: string };
  children: React.ReactNode;
}) {
  const { gradientStart, gradientEnd, text: headerText, icon: headerIcon } = Colors.cardHeaderGreen;
  const cardBorderColor = colors.emeraldBorder ?? colors.cardBorder ?? colors.border;
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: cardBorderColor,
      }}>
      <LinearGradient
        colors={[gradientStart, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <IconSymbol name={icon} size={14} color={headerIcon} />
        <ThemedText
          style={{
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: headerText,
          }}>
          {title}
        </ThemedText>
      </LinearGradient>
      <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  baseCard: {
    width: '100%',
  },
  baseCardInner: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
    padding: 3,
    height: 44,
  },
  placeholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  plotTab: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  plotLoader: {
    marginTop: 24,
  },
  addPlotCard: {
    width: '100%',
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  addPlotTitle: {
    marginTop: 12,
  },
  addPlotSub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  addPlotCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addPlotTitleSmall: {
    fontSize: 15,
  },
  plotCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  plotCardCover: {
    width: '100%',
    height: 100,
    backgroundColor: '#e5e5e5',
  },
  plotCardContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  plotCardBodyTouch: {
    flex: 1,
    minWidth: 0,
  },
  plotCardBody: {
    gap: 4,
  },
  plotCardTitle: {
    fontSize: 16,
  },
  plotCardMeta: {
    fontSize: 13,
  },
  plotCardDelete: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  plotCardDeleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imageWrap: {
    marginTop: 16,
    marginBottom: 16,
    alignSelf: 'center',
  },
  profileArrowOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  profilePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    textAlign: 'center',
  },
  code: {
    fontSize: 16,
    marginTop: 4,
  },
  error: {
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    flex: 0,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  docRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  docRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  docRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docRowIconBtn: {
    padding: 8,
    margin: -4,
  },
  docRowBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  docRowBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  docUploadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  docUploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContent: {
    width: '100%',
    maxHeight: '90%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 400,
    marginBottom: 16,
  },
  previewClose: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
