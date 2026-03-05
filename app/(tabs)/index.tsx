import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Button, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { fetchMyFarmer, fetchMyAssignedFarmers, type FarmerProfile } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [assignedFarmers, setAssignedFarmers] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      if (user.role === 'FARMER') {
        const f = await fetchMyFarmer();
        setFarmer(f);
      } else if (user.role === 'FIELD_OFFICER') {
        const list = await fetchMyAssignedFarmers();
        setAssignedFarmers(list);
      }
    } catch {
      setFarmer(null);
      setAssignedFarmers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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
    const agent = farmer?.FarmerAgentMaps?.[0]?.Agent;
    const profilePic = farmer?.profile_pic_url;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <View style={styles.profileImageWrap}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.profileImage} resizeMode="cover" />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.muted }]}>
                <IconSymbol name="person.fill" size={64} color={colors.background} />
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

        <Card style={[styles.card, { borderWidth: 1, borderColor: colors.emeraldBorder ?? colors.cardBorder, borderRadius: 12, overflow: 'hidden' }]}>
          <Card.Title title="Details" titleVariant="titleMedium" />
          <Card.Content>
            <Row label="Gender" value={farmer?.gender ?? '—'} />
            <Row label="DOB" value={farmer?.dob ?? '—'} />
            <Row label="Education" value={farmer?.education ?? '—'} />
            <Row label="KYC" value={farmer?.kyc_status ?? '—'} />
            {addr && (
              <>
                <Row label="Village" value={addr.village ?? '—'} />
                <Row label="Taluka" value={addr.taluka ?? '—'} />
                <Row label="District" value={addr.district ?? '—'} />
                <Row label="State" value={addr.state ?? '—'} />
              </>
            )}
          </Card.Content>
        </Card>

        {agent && (
          <Card style={[styles.card, { borderWidth: 1, borderColor: colors.emeraldBorder ?? colors.cardBorder, borderRadius: 12, overflow: 'hidden' }]}>
            <Card.Title title="Assigned field officer" titleVariant="titleMedium" />
            <Card.Content>
              <Text variant="titleSmall">{agent.email ?? '—'}</Text>
              {agent.mobile ? (
                <Text variant="bodySmall" style={{ color: colors.mutedForeground, marginTop: 4 }}>
                  {agent.mobile}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        )}

        <Button mode="outlined" onPress={logout} style={styles.logoutBtn}>
          Log out
        </Button>
      </ScrollView>
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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
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
                <IconSymbol
                  name={searchVisible ? 'xmark.circle.fill' : 'magnifyingglass'}
                  size={24}
                  color={Colors.cardHeaderGreen.text}
                />
              </TouchableOpacity>
            </View>
          </View>
          {searchVisible && (
            <View style={[styles.searchInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.mutedForeground} />
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
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.mutedForeground} />
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageWrap: {
    marginBottom: 12,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  profileImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    textAlign: 'center',
  },
  code: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
  },
  helloCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
  },
  helloCardInner: {
    padding: 28,
    paddingTop: 40,
    paddingBottom: 40,
    minHeight: 88,
  },
  helloGreeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.cardHeaderGreen.text,
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 12,
  },
  helloMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  helloMetaText: {
    fontSize: 13,
    color: 'rgba(240,253,244,0.85)',
    flex: 1,
    minWidth: 0,
  },
  helloPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  helloPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.cardHeaderGreen.text,
  },
  assignedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  assignedCardHeader: {
    paddingVertical: 14,
    paddingHorizontal: 20,
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
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  assignedCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cardHeaderGreen.text,
  },
  assignedCardContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  agentCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  agentEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  agentMobile: {
    fontSize: 14,
    marginTop: 4,
  },
  farmerCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  farmerCode: {
    fontSize: 14,
    marginTop: 2,
  },
  farmerVillage: {
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    paddingVertical: 16,
    textAlign: 'center',
  },
  logoutBtn: {
    marginTop: 16,
  },
});
