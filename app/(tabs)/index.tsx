import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchMyFarmer,
  fetchMyProfileDownloadUrl,
  fetchMyAssignedFarmers,
  fetchMyPlots,
  type FarmerProfile,
  type FarmerPlotRecord,
} from '@/lib/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';

const T = {
  primary: '#3D7A4F',
  primaryLight: '#5FA870',
  primaryDark: '#245533',
  secondary: '#82C341',
  secondaryLight: '#A5DA6B',
  bg: '#F9FBF7',
  surface: '#FFFFFF',
  text: '#1B2A1E',
  textMuted: '#607060',
  border: '#D0DDD4',
  headerTint: '#EDF7EF',
  danger: '#E05252',
};

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [assignedFarmers, setAssignedFarmers] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [farmerTab, setFarmerTab] = useState<'details' | 'plot'>('details');
  const [plots, setPlots] = useState<FarmerPlotRecord[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const scrollPadding = 12;
  const contentWidth = screenWidth - scrollPadding * 2;
  const FARMER_TAB_WIDTH = contentWidth / 2;
  const farmerTabAnim = useRef(new Animated.Value(0)).current;

  const handleFarmerTabPress = useCallback((key: 'details' | 'plot', index: number) => {
    setFarmerTab(key);
    Animated.spring(farmerTabAnim, {
      toValue: index * FARMER_TAB_WIDTH,
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start();
  }, [FARMER_TAB_WIDTH, farmerTabAnim]);

  const load = async () => {
    if (!user) return;
    try {
      if (user.role === 'FARMER') {
        const f = await fetchMyFarmer();
        setFarmer(f);
        setProfilePicUrl(null);
        if (f?.profile_pic_url) {
          try {
            const { url } = await fetchMyProfileDownloadUrl();
            setProfilePicUrl(url);
          } catch {
            // keep placeholder
          }
        }
      } else if (user.role === 'FIELD_OFFICER') {
        const list = await fetchMyAssignedFarmers();
        setAssignedFarmers(list);
      }
    } catch {
      setFarmer(null);
      setProfilePicUrl(null);
      setAssignedFarmers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id, user?.role]);

  const loadPlots = useCallback(async () => {
    if (user?.role !== 'FARMER') return;
    setPlotsLoading(true);
    try {
      const list = await fetchMyPlots();
      setPlots(list);
    } catch {
      setPlots([]);
    } finally {
      setPlotsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === 'FARMER' && farmerTab === 'plot') loadPlots();
  }, [user?.role, farmerTab, loadPlots]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    if (user?.role === 'FARMER' && farmerTab === 'plot') loadPlots();
  };

  if (!user) return null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (user.role === 'FARMER') {
    const addr = farmer?.FarmerAddress;
    const profile = farmer?.FarmerProfileDetail;
    const bank = farmer?.FarmerBank;
    const docs = farmer?.FarmerDoc;
    const agent = farmer?.FarmerAgentMaps?.[0]?.Agent;
    const profilePic = profilePicUrl;

    return (
      <>
        <ScrollView
          style={[styles.scroll, { backgroundColor: T.bg }]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.heroAvatar} resizeMode="cover" />
              ) : (
                <View style={styles.heroAvatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={32} color={T.textMuted} />
                </View>
              )}
              <View>
                <Text style={styles.heroName}>{farmer?.name ?? '—'}</Text>
                <Text style={styles.heroCode}>{farmer?.farmer_code ?? '—'}</Text>
                <View style={[styles.statusChip, (farmer as { is_activated?: boolean })?.is_activated && styles.statusChipActive]}>
                  <Text style={[styles.statusChipText, (farmer as { is_activated?: boolean })?.is_activated && styles.statusChipTextActive]}>
                    {(farmer as { is_activated?: boolean })?.is_activated ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.farmerTabBar}>
            <Animated.View
              style={[
                styles.farmerTabSlider,
                {
                  width: FARMER_TAB_WIDTH - 6,
                  transform: [{ translateX: farmerTabAnim }],
                },
              ]}
            />
            <TouchableOpacity
              style={styles.farmerTabTouch}
              onPress={() => handleFarmerTabPress('details', 0)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.farmerTabLabel,
                  { color: farmerTab === 'details' ? T.primary : T.textMuted, fontWeight: farmerTab === 'details' ? '700' : '400' },
                ]}>
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.farmerTabTouch}
              onPress={() => handleFarmerTabPress('plot', 1)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.farmerTabLabel,
                  { color: farmerTab === 'plot' ? T.primary : T.textMuted, fontWeight: farmerTab === 'plot' ? '700' : '400' },
                ]}>
                Plot
              </Text>
            </TouchableOpacity>
          </View>

          {farmerTab === 'details' && (
            <View style={[styles.farmerTabContent, styles.farmerDetailsCards]}>
              <InfoCard title="Personal" icon="person.fill">
                <DetailRow label="Farmer Code" value={farmer?.farmer_code ?? '—'} />
                <DetailRow label="Name" value={farmer?.name ?? '—'} />
                <DetailRow label="Mobile" value={farmer?.mobile ?? '—'} />
                <DetailRow label="Aadhaar" value={docs?.aadhaar_number ?? '—'} />
                <DetailRow label="PAN" value={docs?.pan_number ?? '—'} />
                <DetailRow label="Ration Card" value={profile?.ration_card === true ? 'Available' : 'Not available'} />
              </InfoCard>
              <InfoCard title="Address" icon="mappin.circle.fill">
                <DetailRow label="Village" value={addr?.village ?? '—'} />
                <DetailRow label="Taluka" value={addr?.taluka ?? '—'} />
                <DetailRow label="District" value={addr?.district ?? '—'} />
              </InfoCard>
              <InfoCard title="Associations" icon="person.3.fill">
                <DetailRow label="FPC" value={profile?.fpc ?? '—'} />
                <DetailRow label="SHG" value={profile?.shg ?? '—'} />
              </InfoCard>
              <InfoCard title="Bank" icon="banknote.fill">
                <DetailRow label="Bank Name" value={bank?.bank_name ?? '—'} />
                <DetailRow label="IFSC" value={bank?.ifsc_code ?? '—'} />
                <DetailRow label="Account No." value={bank?.account_number ?? '—'} />
                <DetailRow label="Verification" value={bank?.verified === true ? 'Verified ✓' : 'Not verified'} />
              </InfoCard>
              {agent && (
                <InfoCard title="Assigned field officer" icon="person.badge.plus">
                  <DetailRow label="Email" value={agent.email ?? '—'} />
                  {agent.mobile ? <DetailRow label="Mobile" value={agent.mobile} /> : null}
                </InfoCard>
              )}
              <TouchableOpacity style={styles.logoutRow} onPress={logout} activeOpacity={0.7}>
                <MaterialCommunityIcons name="logout-variant" size={16} color={T.textMuted} />
                <Text style={styles.logoutRowText}>Log out</Text>
              </TouchableOpacity>
            </View>
          )}

          {farmerTab === 'plot' && (
            <View style={styles.farmerPlotTab}>
              {plotsLoading ? (
                <ActivityIndicator size="large" color={T.primary} style={styles.plotLoader} />
              ) : plots.length === 0 ? (
                <View style={styles.addPlotCard}>
                  <Text style={styles.addPlotSub}>
                    No plots yet. Plots are added by your field officer.
                  </Text>
                </View>
              ) : (
                <>
                  {plots.map((plot) => {
                    const plotTitle = [plot.season, plot.variety].filter(Boolean).join(' · ') || 'Plot';
                    const plotMeta = [plot.land_size_value != null && `${plot.land_size_value} ${plot.units ?? ''}`.trim(), plot.taluka, plot.district].filter(Boolean).join(' · ') || '—';
                    const goToPlot = () =>
                      router.push({
                        pathname: '/plot/[id]',
                        params: { id: plot.id, farmerId: String(farmer?.id), plotTitle, plotMeta },
                      });
                    return (
                      <TouchableOpacity
                        key={plot.id}
                        style={styles.plotCardChip}
                        activeOpacity={0.9}
                        onPress={goToPlot}>
                        <View style={styles.plotCardChipBody}>
                          <Text style={styles.plotCardChipTitle}>{plotTitle}</Text>
                          <View style={styles.plotCardChipMetaRow}>
                            {plot.land_size_value != null && (
                              <View style={styles.plotMetaChip}>
                                <MaterialCommunityIcons name="ruler-square" size={12} color={T.primary} />
                                <Text style={styles.plotMetaChipText}>{`${plot.land_size_value} ${plot.units ?? ''}`.trim()}</Text>
                              </View>
                            )}
                            {plot.taluka ? (
                              <View style={styles.plotMetaChip}>
                                <MaterialCommunityIcons name="map-marker-outline" size={12} color={T.primary} />
                                <Text style={styles.plotMetaChipText}>{String(plot.taluka)}</Text>
                              </View>
                            ) : null}
                            {plot.sowing_date ? (
                              <View style={styles.plotMetaChip}>
                                <MaterialCommunityIcons name="calendar-outline" size={12} color={T.primary} />
                                <Text style={styles.plotMetaChipText}>{String(plot.sowing_date)}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          )}
        </ScrollView>

      </>
    );
  }

  if (user.role === 'FIELD_OFFICER') {
    const email = user.email ?? '';
    const displayName = email.split('@')[0] || 'there';
    const q = searchQuery.trim().toLowerCase();
    const filteredFarmers = q
      ? assignedFarmers.filter(
          (f) =>
            (f.name ?? '').toLowerCase().includes(q) ||
            (f.farmer_code ?? '').toLowerCase().includes(q) ||
            (f.FarmerAddress?.village ?? '').toLowerCase().includes(q) ||
            (f.FarmerAddress?.taluka ?? '').toLowerCase().includes(q) ||
            (f.FarmerAddress?.district ?? '').toLowerCase().includes(q)
        )
      : assignedFarmers;
    return (
      <ScrollView
        style={[styles.scroll, { backgroundColor: T.bg }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}>
        <View style={styles.greetingCard}>
          <View style={styles.greetingRow1}>
            <View style={styles.greetingLogoPill}>
              <Image source={require('@/assets/images/digi-prishi-logo.webp')} style={styles.greetingLogo} resizeMode="contain" />
              <Text style={styles.greetingLogoText}>Digi Krishi</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutIconBtn} hitSlop={8} accessibilityLabel="Log out">
              <MaterialCommunityIcons name="logout-variant" size={20} color={T.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.greetingTitle} numberOfLines={1}>Hello, {displayName} 🌾</Text>
          <View style={styles.greetingRow3}>
            <Text style={styles.greetingEmail} numberOfLines={1}>{email || '—'}</Text>
            <View style={styles.fieldOfficerChip}>
              <Text style={styles.fieldOfficerChipText}>Field Officer</Text>
            </View>
          </View>
        </View>

        <View style={styles.assignedCard}>
          <View style={styles.assignedCardHeader}>
            <Text style={styles.assignedCardTitle}>Assigned Farmers</Text>
            <View style={styles.assignedCardHeaderRight}>
              <View style={styles.assignedCountBadge}>
                <Text style={styles.assignedCountBadgeText}>{assignedFarmers.length}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSearchVisible((v) => !v)}
                style={styles.searchButton}
                hitSlop={8}
                accessibilityLabel="Search farmers"
                accessibilityRole="button">
                <MaterialCommunityIcons name={searchVisible ? 'close' : 'magnify'} size={22} color={T.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {searchVisible && (
            <View style={styles.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color={T.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, code, village..."
                placeholderTextColor={T.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={20} color={T.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.assignedCardContent}>
            {assignedFarmers.length === 0 ? (
              <Text style={styles.empty}>No farmers assigned to you yet.</Text>
            ) : filteredFarmers.length === 0 ? (
              <Text style={styles.empty}>No farmers match "{searchQuery}".</Text>
            ) : (
              filteredFarmers.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.farmerListCard}
                  onPress={() => router.push(`/farmer/${f.id}`)}
                  activeOpacity={0.7}>
                  <View style={styles.farmerListCardIcon}>
                    <Feather name="user-check" size={20} color={T.primary} />
                  </View>
                  <View style={styles.farmerListCardBody}>
                    <Text style={styles.farmerListCardName}>{f.name}</Text>
                    <Text style={styles.farmerListCardCode}>{f.farmer_code}</Text>
                    {(f.FarmerAddress?.village || f.FarmerAddress?.district) && (
                      <Text style={styles.farmerListCardVillage} numberOfLines={1}>
                        {[f.FarmerAddress?.village, f.FarmerAddress?.district].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={T.border} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={{ color: T.text }}>Unknown role</Text>
      <TouchableOpacity style={styles.logoutRow} onPress={logout} activeOpacity={0.7}>
        <MaterialCommunityIcons name="logout-variant" size={16} color={T.textMuted} />
        <Text style={styles.logoutRowText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: T.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: T.text }]}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailRowLabel, { color: T.textMuted }]}>{label}</Text>
      <Text style={[styles.detailRowValue, { color: T.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const INFO_CARD_ICONS: Record<string, 'account-circle-outline' | 'map-marker-outline' | 'account-group' | 'cash' | 'file-document-outline' | 'face-agent'> = {
  'person.fill': 'account-circle-outline',
  'mappin.circle.fill': 'map-marker-outline',
  'person.3.fill': 'account-group',
  'banknote.fill': 'cash',
  'doc.fill': 'file-document-outline',
  'person.badge.plus': 'face-agent',
};

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: 'person.fill' | 'mappin.circle.fill' | 'person.3.fill' | 'banknote.fill' | 'doc.fill' | 'person.badge.plus';
  children: React.ReactNode;
}) {
  const mciName = INFO_CARD_ICONS[icon] ?? 'circle-outline';
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <MaterialCommunityIcons name={mciName} size={18} color={T.primary} />
        <Text style={styles.infoCardTitle}>{title}</Text>
      </View>
      <View style={styles.infoCardBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: T.border,
  },
  heroAvatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: T.border,
    backgroundColor: T.headerTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroName: {
    fontSize: 17,
    fontWeight: '800',
    color: T.text,
  },
  heroCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: T.textMuted,
    marginTop: 2,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    marginTop: 6,
    backgroundColor: T.textMuted + '20',
  },
  statusChipActive: {
    backgroundColor: T.primary + '18',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.textMuted,
  },
  statusChipTextActive: {
    color: T.primary,
  },
  farmerTabBar: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
    padding: 3,
    height: 38,
    backgroundColor: T.bg,
    borderRadius: 14,
    position: 'relative',
    borderWidth: 1,
    borderColor: T.border,
  },
  farmerTabSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 9,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  farmerTabTouch: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerTabLabel: {
    fontSize: 12,
  },
  farmerTabContent: {
    width: '100%',
  },
  farmerDetailsCards: {
    gap: 0,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutRowText: {
    fontSize: 13,
    color: T.textMuted,
  },
  farmerPlotTab: {
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  plotLoader: {
    marginTop: 24,
  },
  addPlotCard: {
    width: '100%',
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: T.border,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  addPlotSub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    color: T.text,
  },
  plotCardChip: {
    width: '100%',
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  plotCardChipBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 16,
    borderLeftWidth: 4,
    borderLeftColor: T.secondary,
  },
  plotCardChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.text,
  },
  plotCardChipMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  plotMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.headerTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  plotMetaChipText: {
    fontSize: 11,
    color: T.text,
    fontWeight: '500',
  },
  greetingCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  greetingRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  greetingLogoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  greetingLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
  },
  logoutIconBtn: {
    padding: 4,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.text,
    marginBottom: 6,
  },
  greetingRow3: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  greetingEmail: {
    fontSize: 12,
    color: T.textMuted,
    flex: 1,
    minWidth: 0,
  },
  fieldOfficerChip: {
    backgroundColor: T.primary + '18',
    borderWidth: 1,
    borderColor: T.primary + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  fieldOfficerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.primary,
  },
  assignedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  assignedCardHeader: {
    backgroundColor: T.headerTint,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignedCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.primary,
  },
  assignedCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assignedCountBadge: {
    backgroundColor: T.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  assignedCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.surface,
  },
  searchButton: {
    padding: 4,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 0,
    color: T.text,
  },
  assignedCardContent: {
    padding: 12,
    backgroundColor: T.surface,
  },
  farmerListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
    gap: 10,
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  farmerListCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerListCardBody: {
    flex: 1,
    minWidth: 0,
  },
  farmerListCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
  },
  farmerListCardCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: T.textMuted,
    marginTop: 2,
  },
  farmerListCardVillage: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
  },
  empty: {
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 13,
    color: T.textMuted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border + '80',
  },
  detailRowLabel: {
    fontSize: 12,
    flex: 0,
  },
  detailRowValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  infoCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
  infoCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
