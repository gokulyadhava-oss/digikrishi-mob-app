import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  Card,
  TextInput,
  Button,
  Switch,
  useTheme,
  Text,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import {
  createFarmer,
  uploadProfileImage,
  type FarmerCreatePayload,
} from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const emptyForm = {
  farmer_code: '',
  name: '',
  mobile: '',
  ration_card: false,
  fpc: '',
  shg: '',
  aadhaar_number: '',
  pan_number: '',
  village: '',
  taluka: '',
  district: '',
  bank_name: '',
  ifsc_code: '',
  account_number: '',
  bank_verified: false,
};

export default function AddFarmerScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme() ?? 'dark';
  const emeraldBorder = Colors[colorScheme].emeraldBorder ?? Colors[colorScheme].cardBorder;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to add a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.farmer_code.trim() || !form.name.trim()) {
      Alert.alert('Error', 'Farmer code and Name are required');
      return;
    }
    setSaving(true);
    try {
      const payload: FarmerCreatePayload = {
        farmer_code: form.farmer_code.trim(),
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        is_activated: true,
        address: {
          village: form.village.trim() || undefined,
          taluka: form.taluka.trim() || undefined,
          district: form.district.trim() || undefined,
        },
        profileDetails: {
          fpc: form.fpc.trim() || undefined,
          shg: form.shg.trim() || undefined,
          ration_card: form.ration_card,
        },
        bankDetails: {
          bank_name: form.bank_name.trim() || null,
          ifsc_code: form.ifsc_code.trim() || null,
          account_number: form.account_number.trim() || null,
          verified: form.bank_verified,
        },
        docs: {
          aadhaar_number: form.aadhaar_number.trim() || null,
          pan_number: form.pan_number.trim() || null,
        },
      };
      const farmer = await createFarmer(payload);
      if (profileImageUri) {
        try {
          await uploadProfileImage(farmer.id, {
            uri: profileImageUri,
            type: 'image/jpeg',
            name: 'profile.jpg',
          });
        } catch (uploadErr) {
          Alert.alert(
            'Farmer saved, upload failed',
            (uploadErr instanceof Error ? uploadErr.message : 'Profile picture could not be uploaded. You can add it from the farmer detail screen.')
          );
        }
      }
      setForm(emptyForm);
      setProfileImageUri(null);
      Alert.alert('Saved', `${farmer.name} added.` + (profileImageUri ? ' Profile picture uploaded.' : ''), [{ text: 'OK' }]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create farmer';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kav}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Card
          style={[styles.card, theme.dark && styles.cardPremiumDark, { borderWidth: 1, borderColor: emeraldBorder, borderRadius: 12, overflow: 'hidden' }]}
          mode="elevated">
          <Card.Title title="Profile picture (optional)" titleVariant="titleMedium" />
          <Card.Content style={styles.cardContent}>
            {profileImageUri ? (
              <View style={styles.profilePreviewRow}>
                <Image source={{ uri: profileImageUri }} style={styles.profilePreview} />
                <Button mode="outlined" onPress={() => setProfileImageUri(null)} compact>
                  Remove
                </Button>
              </View>
            ) : (
              <Button mode="outlined" onPress={pickProfileImage} icon="camera">
                Add profile picture
              </Button>
            )}
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, theme.dark && styles.cardPremiumDark, { borderWidth: 1, borderColor: emeraldBorder, borderRadius: 12, overflow: 'hidden' }]}
          mode="elevated">
          <Card.Title title="Basic details" titleVariant="titleMedium" />
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Farmer code *"
              value={form.farmer_code}
              onChangeText={(v) => update('farmer_code', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Name *"
              value={form.name}
              onChangeText={(v) => update('name', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Mobile"
              value={form.mobile}
              onChangeText={(v) => update('mobile', v)}
              placeholder="Not available"
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <View style={styles.toggleRow}>
              <Text variant="bodyMedium">Ration card</Text>
              <View style={styles.toggleRight}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {form.ration_card ? 'Available' : 'Not available'}
                </Text>
                <Switch
                  value={form.ration_card}
                  onValueChange={(v) => update('ration_card', v)}
                  color={theme.colors.primary}
                />
              </View>
            </View>
            <TextInput
              label="FPC"
              value={form.fpc}
              onChangeText={(v) => update('fpc', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="SHG"
              value={form.shg}
              onChangeText={(v) => update('shg', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Aadhaar number"
              value={form.aadhaar_number}
              onChangeText={(v) => update('aadhaar_number', v)}
              placeholder="Not available"
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="PAN number"
              value={form.pan_number}
              onChangeText={(v) => update('pan_number', v)}
              placeholder="Not available"
              mode="outlined"
              autoCapitalize="characters"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, theme.dark && styles.cardPremiumDark, { borderWidth: 1, borderColor: emeraldBorder, borderRadius: 12, overflow: 'hidden' }]}
          mode="elevated">
          <Card.Title title="Address" titleVariant="titleMedium" />
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Village"
              value={form.village}
              onChangeText={(v) => update('village', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Taluka"
              value={form.taluka}
              onChangeText={(v) => update('taluka', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="District"
              value={form.district}
              onChangeText={(v) => update('district', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, theme.dark && styles.cardPremiumDark, { borderWidth: 1, borderColor: emeraldBorder, borderRadius: 12, overflow: 'hidden' }]}
          mode="elevated">
          <Card.Title title="Bank details" titleVariant="titleMedium" />
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Bank name"
              value={form.bank_name}
              onChangeText={(v) => update('bank_name', v)}
              placeholder="Not available"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="IFSC code"
              value={form.ifsc_code}
              onChangeText={(v) => update('ifsc_code', v)}
              placeholder="Not available"
              mode="outlined"
              autoCapitalize="characters"
              style={styles.input}
            />
            <TextInput
              label="Account number"
              value={form.account_number}
              onChangeText={(v) => update('account_number', v)}
              placeholder="Not available"
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.toggleRow}>
              <Text variant="bodyMedium">Bank verification</Text>
              <View style={styles.toggleRight}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {form.bank_verified ? 'Verified' : 'Not verified'}
                </Text>
                <Switch
                  value={form.bank_verified}
                  onValueChange={(v) => update('bank_verified', v)}
                  color={theme.colors.primary}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => setForm(emptyForm)}
            disabled={saving}
            style={styles.actionBtn}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            style={styles.actionBtn}>
            Save changes
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const premiumDarkCard = {
  backgroundColor: '#14181c',
  borderWidth: 1,
  borderColor: '#2d333b',
};

const styles = StyleSheet.create({
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { marginBottom: 16 },
  cardPremiumDark: premiumDarkCard,
  cardContent: { gap: 8 },
  profilePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profilePreview: { width: 80, height: 80, borderRadius: 40 },
  input: { marginBottom: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionBtn: { minWidth: 100 },
});
