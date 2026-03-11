import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
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
import { Button, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchMyFarmer,
  fetchMyProfileDownloadUrl,
  fetchMyAssignedFarmers,
  fetchMyPlots,
  type FarmerProfile,
  type FarmerPlotRecord,
} from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

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
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (user.role === 'FARMER') {
    const addr = farmer?.FarmerAddress;
    const profile = farmer?.FarmerProfileDetail;
    const bank = farmer?.FarmerBank;
    const docs = farmer?.FarmerDoc;
    const agent = farmer?.FarmerAgentMaps?.[0]?.Agent;
    const profilePic = profilePicUrl;
    const tabBorder = colors.emeraldBorder ?? colors.cardBorder;

    return (
      <>
        <ScrollView
          style={[styles.scroll, { backgroundColor: Colors.bg }]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          <View style={[styles.topBar, { backgroundColor: Colors.bg }]}>
            <Image source={require('@/assets/images/digi-prishi-logo.webp')} style={styles.topBarLogo} resizeMode="contain" />
          </View>
          <View style={styles.header}>
            <View style={styles.profileImageWrap}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profileImage} resizeMode="cover" />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.muted }]}>
                  <MaterialCommunityIcons name="account-circle-outline" size={40} color={colors.background} />
                </View>
              )}
            </View>
            <ThemedText type="title" style={styles.name}>
              {farmer?.name ?? '—'}
            </ThemedText>
            <ThemedText style={[styles.code, { color: colors.mutedForeground }]}>
              {farmer?.farmer_code ?? '—'}
            </ThemedText>
          </View>

          <View style={[styles.farmerTabBar, { backgroundColor: colors.muted, borderRadius: 14 }]}>
            <Animated.View
              style={{
                position: 'absolute',
                width: FARMER_TAB_WIDTH - 6,
                top: 3,
                bottom: 3,
                left: 3,
                borderRadius: 9,
                backgroundColor: colors.card,
                transform: [{ translateX: farmerTabAnim }],
                shadowColor: Colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            />
            <TouchableOpacity
              style={styles.farmerTabTouch}
              onPress={() => handleFarmerTabPress('details', 0)}
              activeOpacity={0.7}>
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: farmerTab === 'details' ? '700' : '400',
                  color: colors.text,
                  opacity: farmerTab === 'details' ? 1 : 0.88,
                }}>
                Details
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.farmerTabTouch}
              onPress={() => handleFarmerTabPress('plot', 1)}
              activeOpacity={0.7}>
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: farmerTab === 'plot' ? '700' : '400',
                  color: colors.text,
                  opacity: farmerTab === 'plot' ? 1 : 0.88,
                }}>
                Plot
              </ThemedText>
            </TouchableOpacity>
          </View>

          {farmerTab === 'details' && (
            <View style={[styles.farmerTabContent, styles.farmerDetailsCards]}>
              <InfoCard title="Personal" icon="person.fill" colors={colors}>
                <DetailRow label="Farmer Code" value={farmer?.farmer_code ?? '—'} colors={colors} />
                <DetailRow label="Name" value={farmer?.name ?? '—'} colors={colors} />
                <DetailRow label="Mobile" value={farmer?.mobile ?? '—'} colors={colors} />
                <DetailRow label="Aadhaar" value={docs?.aadhaar_number ?? '—'} colors={colors} />
                <DetailRow label="PAN" value={docs?.pan_number ?? '—'} colors={colors} />
                <DetailRow label="Ration Card" value={profile?.ration_card === true ? 'Available' : 'Not available'} colors={colors} />
              </InfoCard>
              <InfoCard title="Address" icon="mappin.circle.fill" colors={colors}>
                <DetailRow label="Village" value={addr?.village ?? '—'} colors={colors} />
                <DetailRow label="Taluka" value={addr?.taluka ?? '—'} colors={colors} />
                <DetailRow label="District" value={addr?.district ?? '—'} colors={colors} />
              </InfoCard>
              <InfoCard title="Associations" icon="person.3.fill" colors={colors}>
                <DetailRow label="FPC" value={profile?.fpc ?? '—'} colors={colors} />
                <DetailRow label="SHG" value={profile?.shg ?? '—'} colors={colors} />
              </InfoCard>
              <InfoCard title="Bank" icon="banknote.fill" colors={colors}>
                <DetailRow label="Bank Name" value={bank?.bank_name ?? '—'} colors={colors} />
                <DetailRow label="IFSC" value={bank?.ifsc_code ?? '—'} colors={colors} />
                <DetailRow label="Account No." value={bank?.account_number ?? '—'} colors={colors} />
                <DetailRow label="Verification" value={bank?.verified === true ? 'Verified ✓' : 'Not verified'} colors={colors} />
              </InfoCard>
              {agent && (
                <InfoCard title="Assigned field officer" icon="person.badge.plus" colors={colors}>
                  <DetailRow label="Email" value={agent.email ?? '—'} colors={colors} />
                  {agent.mobile ? <DetailRow label="Mobile" value={agent.mobile} colors={colors} /> : null}
                </InfoCard>
              )}
              <Button mode="outlined" onPress={logout} style={styles.logoutBtn}>
                Log out
              </Button>
            </View>
          )}

          {farmerTab === 'plot' && (
            <View style={styles.farmerPlotTab}>
              {plotsLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.plotLoader} />
              ) : plots.length === 0 ? (
                <View style={[styles.addPlotCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <ThemedText style={[styles.addPlotSub, { color: colors.text, opacity: 0.8 }]}>
                    No plots yet. Plots are added by your field officer.
                  </ThemedText>
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
                      <View key={plot.id} style={[styles.plotCard, { borderColor: tabBorder }]}>
                        <TouchableOpacity style={styles.plotCardBodyTouch} activeOpacity={0.9} onPress={goToPlot}>
                          <View style={styles.plotCardBody}>
                            <ThemedText type="subtitle" style={styles.plotCardTitle}>{plotTitle}</ThemedText>
                            <ThemedText style={[styles.plotCardMeta, { color: colors.text, opacity: 0.9 }]}>{plotMeta}</ThemedText>
                            {plot.sowing_date ? (
                              <ThemedText style={[styles.plotCardMeta, { color: colors.text, opacity: 0.9 }]}>
                                Sowing: {plot.sowing_date}
                              </ThemedText>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      </View>
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
    const { gradientStart, gradientEnd } = Colors.cardHeaderGreen;
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
        style={[styles.scroll, { backgroundColor: Colors.bg }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={[styles.topBar, { backgroundColor: Colors.bg }]}>
          <Image source={require('@/assets/images/digi-prishi-logo.webp')} style={styles.topBarLogo} resizeMode="contain" />
        </View>
        <View style={[styles.helloCard, { borderColor: colors.emeraldBorder ?? colors.cardBorder }]}>
          <LinearGradient
            colors={[gradientStart, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.helloCardInner}>
            <ThemedText style={styles.helloGreeting} numberOfLines={1}>
              Hello, {displayName}
            </ThemedText>
            <View style={styles.helloMeta}>
              <ThemedText style={styles.helloMetaText} numberOfLines={1}>{email || '—'}</ThemedText>
              <View style={styles.helloPill}>
                <ThemedText style={styles.helloPillText}>Field officer</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.assignedCard, { borderWidth: 1, borderColor: colors.emeraldBorder ?? colors.cardBorder }]}>
          <View style={styles.assignedCardHeader}>
            <LinearGradient
              colors={[gradientStart, gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.assignedCardHeaderRow}>
              <ThemedText style={styles.assignedCardTitle}>Assigned farmers</ThemedText>
              <TouchableOpacity
                onPress={() => setSearchVisible((v) => !v)}
                style={styles.searchButton}
                hitSlop={8}
                accessibilityLabel="Search farmers"
                accessibilityRole="button">
                <MaterialCommunityIcons
                  name={searchVisible ? 'close' : 'magnify'}
                  size={24}
                  color={Colors.cardHeaderGreen.text}
                />
              </TouchableOpacity>
            </View>
          </View>
          {searchVisible && (
            <View style={[styles.searchInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.text, backgroundColor: colors.background }]}
                placeholder="Search by name, code, village..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={[styles.assignedCardContent, { backgroundColor: colors.background }]}>
            {assignedFarmers.length === 0 ? (
              <Text variant="bodyMedium" style={[styles.empty, { color: colors.mutedForeground }]}>
                No farmers assigned to you yet.
              </Text>
            ) : filteredFarmers.length === 0 ? (
              <Text variant="bodyMedium" style={[styles.empty, { color: colors.mutedForeground }]}>
                No farmers match "{searchQuery}".
              </Text>
            ) : (
              filteredFarmers.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.farmerCard, { borderColor: colors.emeraldBorder ?? colors.cardBorder }]}
                  onPress={() => router.push(`/farmer/${f.id}`)}
                  activeOpacity={0.7}>
                  <View style={[styles.farmerCardIconWrap, { backgroundColor: `${colors.primary}22` }]}>
                    <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.farmerCardBody}>
                    <ThemedText style={styles.farmerName}>{f.name}</ThemedText>
                    <ThemedText style={[styles.farmerCode, { color: colors.mutedForeground }]}>
                      {f.farmer_code}
                    </ThemedText>
                    {f.FarmerAddress?.village ? (
                      <ThemedText style={[styles.farmerVillage, { color: colors.mutedForeground }]}>
                        {f.FarmerAddress.village}
                        {f.FarmerAddress.district ? `, ${f.FarmerAddress.district}` : ''}
                      </ThemedText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        <Button mode="outlined" onPress={logout} style={styles.logoutBtn}>
          Log out
        </Button>
      </ScrollView>
    );
  }

  return (
    <ThemedView style={styles.centered}>
      <ThemedText>Unknown role</ThemedText>
      <Button mode="outlined" onPress={logout} style={styles.logoutBtn}>
        Log out
      </Button>
    </ThemedView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string };
}) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={[styles.detailRowLabel, { color: colors.text, opacity: 0.9 }]}>{label}</ThemedText>
      <ThemedText style={styles.detailRowValue} numberOfLines={2}>{value}</ThemedText>
    </View>
  );
}

const INFO_CARD_ICONS: Record<string, 'account-circle-outline' | 'map-marker-outline' | 'account-group' | 'cash' | 'file-document-outline' | 'account-plus-outline'> = {
  'person.fill': 'account-circle-outline',
  'mappin.circle.fill': 'map-marker-outline',
  'person.3.fill': 'account-group',
  'banknote.fill': 'cash',
  'doc.fill': 'file-document-outline',
  'person.badge.plus': 'account-plus-outline',
};

function InfoCard({
  title,
  icon,
  colors,
  children,
}: {
  title: string;
  icon: 'person.fill' | 'mappin.circle.fill' | 'person.3.fill' | 'banknote.fill' | 'doc.fill' | 'person.badge.plus';
  colors: { card: string; border: string; muted: string; primary: string; mutedForeground: string; emeraldBorder?: string; cardBorder?: string };
  children: React.ReactNode;
}) {
  const { gradientStart, gradientEnd, text: headerText, icon: headerIcon } = Colors.cardHeaderGreen;
  const cardBorderColor = colors.emeraldBorder ?? colors.cardBorder ?? colors.border;
  const mciName = INFO_CARD_ICONS[icon] ?? 'circle-outline';
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: cardBorderColor,
        marginBottom: 8,
        shadowColor: Colors.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}>
      <LinearGradient
        colors={[gradientStart, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
        <MaterialCommunityIcons name={mciName} size={18} color={headerIcon} />
        <ThemedText
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: headerText,
          }}>
          {title}
        </ThemedText>
      </LinearGradient>
      <View style={{ paddingHorizontal: 10, paddingVertical: 2 }}>{children}</View>
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
  topBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  topBarLogo: {
    height: 32,
    width: 110,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageWrap: {
    marginBottom: 8,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  profileImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    textAlign: 'center',
    fontSize: 18,
  },
  code: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    marginBottom: 10,
  },
  helloCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
  },
  helloCardInner: {
    padding: 14,
    paddingVertical: 18,
    minHeight: 56,
  },
  helloGreeting: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cardHeaderGreen.text,
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 6,
  },
  helloMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  helloMetaText: {
    fontSize: 11,
    color: Colors.cardHeaderGreen.subtitle,
    flex: 1,
    minWidth: 0,
  },
  helloPill: {
    backgroundColor: Colors.cardHeaderGreen.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  helloPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.cardHeaderGreen.text,
  },
  assignedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  assignedCardHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  assignedCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchButton: {
    padding: 4,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  assignedCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.cardHeaderGreen.text,
  },
  assignedCardContent: {
    padding: 12,
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
  farmerDetailsCards: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  detailRowLabel: {
    fontSize: 12,
    flex: 0,
  },
  detailRowValue: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  agentCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  agentEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  agentMobile: {
    fontSize: 12,
    marginTop: 2,
  },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  farmerCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerCardBody: {
    flex: 1,
    minWidth: 0,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  farmerCode: {
    fontSize: 12,
    marginTop: 2,
  },
  farmerVillage: {
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  logoutBtn: {
    marginTop: 12,
  },
  farmerTabBar: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
    marginBottom: 8,
    padding: 3,
    height: 38,
  },
  farmerTabTouch: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerTabContent: {
    width: '100%',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  addPlotTitle: {
    marginTop: 8,
    fontSize: 15,
  },
  addPlotSub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  addPlotCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addPlotTitleSmall: {
    fontSize: 13,
  },
  plotCard: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    padding: 10,
  },
  plotCardBodyTouch: {
    flex: 1,
    minWidth: 0,
  },
  plotCardBody: {
    gap: 2,
  },
  plotCardTitle: {
    fontSize: 14,
  },
  plotCardMeta: {
    fontSize: 12,
  },
});
