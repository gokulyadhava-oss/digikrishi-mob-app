import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  createFarmer,
  uploadProfileImage,
  type FarmerCreatePayload,
} from '@/lib/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  border:        '#D0DDD4',
  headerTint:    '#EDF7EF',
  danger:        '#E05252',
};

// ─── Empty form ───────────────────────────────────────────────────────────────
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

// ─── Reusable: Section Card ───────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name={icon as any} size={16} color={T.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

// ─── Reusable: Labeled Input ──────────────────────────────────────────────────
function LabeledInput({
  label,
  required,
  focused,
  onFocus,
  onBlur,
  ...props
}: {
  label: string;
  required?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>
        {label}
        {required && <Text style={{ color: T.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
        ]}
        placeholderTextColor={T.textMuted + '99'}
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      />
    </View>
  );
}

// ─── Reusable: Toggle Row ─────────────────────────────────────────────────────
function ToggleRow({
  label,
  statusOn,
  statusOff,
  value,
  onValueChange,
}: {
  label: string;
  statusOn: string;
  statusOff: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleStatus}>{value ? statusOn : statusOff}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: T.border, true: T.primaryLight }}
        thumbColor={value ? T.primary : T.surface}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddFarmerScreen() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const focus = (key: string) => () => setFocusedField(key);
  const blur = () => setFocusedField(null);

  const pickProfileImage = () => {
    Alert.alert('Profile picture', 'Choose source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Gallery',
        onPress: async () => {
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
          if (!result.canceled && result.assets[0]) setProfileImageUri(result.assets[0].uri);
        },
      },
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow access to the camera to take a picture.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) setProfileImageUri(result.assets[0].uri);
        },
      },
    ]);
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
            (uploadErr instanceof Error
              ? uploadErr.message
              : 'Profile picture could not be uploaded. You can add it from the farmer detail screen.')
          );
        }
      }
      setForm(emptyForm);
      setProfileImageUri(null);
      Alert.alert(
        'Saved',
        `${farmer.name} added.` + (profileImageUri ? ' Profile picture uploaded.' : ''),
        [{ text: 'OK' }]
      );
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
      style={styles.kav}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Profile Picture ── */}
        <SectionCard icon="account-circle-outline" title="Profile Picture (Optional)">
          {profileImageUri ? (
            <View style={styles.profileSelectedRow}>
              <Image source={{ uri: profileImageUri }} style={styles.profilePreview} />
              <View>
                <Text style={styles.profileSelectedText}>Photo selected</Text>
                <TouchableOpacity onPress={() => setProfileImageUri(null)}>
                  <Text style={styles.profileRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadZone} onPress={pickProfileImage}>
              <MaterialCommunityIcons name="camera-plus-outline" size={32} color={T.textMuted} />
              <Text style={styles.uploadZoneText}>Add profile picture</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* ── Basic Details ── */}
        <SectionCard icon="card-account-details-outline" title="Basic Details">
          <LabeledInput
            label="Farmer Code"
            required
            value={form.farmer_code}
            onChangeText={(v) => update('farmer_code', v)}
            placeholder="Not available"
            focused={focusedField === 'farmer_code'}
            onFocus={focus('farmer_code')}
            onBlur={blur}
          />
          <LabeledInput
            label="Name"
            required
            value={form.name}
            onChangeText={(v) => update('name', v)}
            placeholder="Not available"
            focused={focusedField === 'name'}
            onFocus={focus('name')}
            onBlur={blur}
          />
          <LabeledInput
            label="Mobile"
            value={form.mobile}
            onChangeText={(v) => update('mobile', v)}
            placeholder="Not available"
            keyboardType="phone-pad"
            focused={focusedField === 'mobile'}
            onFocus={focus('mobile')}
            onBlur={blur}
          />
          <ToggleRow
            label="Ration Card"
            statusOn="Available"
            statusOff="Not available"
            value={form.ration_card}
            onValueChange={(v) => update('ration_card', v)}
          />
          <LabeledInput
            label="FPC"
            value={form.fpc}
            onChangeText={(v) => update('fpc', v)}
            placeholder="Not available"
            focused={focusedField === 'fpc'}
            onFocus={focus('fpc')}
            onBlur={blur}
          />
          <LabeledInput
            label="SHG"
            value={form.shg}
            onChangeText={(v) => update('shg', v)}
            placeholder="Not available"
            focused={focusedField === 'shg'}
            onFocus={focus('shg')}
            onBlur={blur}
          />
          <LabeledInput
            label="Aadhaar Number"
            value={form.aadhaar_number}
            onChangeText={(v) => update('aadhaar_number', v)}
            placeholder="Not available"
            keyboardType="numeric"
            focused={focusedField === 'aadhaar_number'}
            onFocus={focus('aadhaar_number')}
            onBlur={blur}
          />
          <LabeledInput
            label="PAN Number"
            value={form.pan_number}
            onChangeText={(v) => update('pan_number', v)}
            placeholder="Not available"
            autoCapitalize="characters"
            focused={focusedField === 'pan_number'}
            onFocus={focus('pan_number')}
            onBlur={blur}
          />
        </SectionCard>

        {/* ── Address ── */}
        <SectionCard icon="map-marker-outline" title="Address">
          <LabeledInput
            label="Village"
            value={form.village}
            onChangeText={(v) => update('village', v)}
            placeholder="Not available"
            focused={focusedField === 'village'}
            onFocus={focus('village')}
            onBlur={blur}
          />
          <LabeledInput
            label="Taluka"
            value={form.taluka}
            onChangeText={(v) => update('taluka', v)}
            placeholder="Not available"
            focused={focusedField === 'taluka'}
            onFocus={focus('taluka')}
            onBlur={blur}
          />
          <LabeledInput
            label="District"
            value={form.district}
            onChangeText={(v) => update('district', v)}
            placeholder="Not available"
            focused={focusedField === 'district'}
            onFocus={focus('district')}
            onBlur={blur}
          />
        </SectionCard>

        {/* ── Bank Details ── */}
        <SectionCard icon="bank-outline" title="Bank Details">
          <LabeledInput
            label="Bank Name"
            value={form.bank_name}
            onChangeText={(v) => update('bank_name', v)}
            placeholder="Not available"
            focused={focusedField === 'bank_name'}
            onFocus={focus('bank_name')}
            onBlur={blur}
          />
          <LabeledInput
            label="IFSC Code"
            value={form.ifsc_code}
            onChangeText={(v) => update('ifsc_code', v)}
            placeholder="Not available"
            autoCapitalize="characters"
            focused={focusedField === 'ifsc_code'}
            onFocus={focus('ifsc_code')}
            onBlur={blur}
          />
          <LabeledInput
            label="Account Number"
            value={form.account_number}
            onChangeText={(v) => update('account_number', v)}
            placeholder="Not available"
            keyboardType="numeric"
            focused={focusedField === 'account_number'}
            onFocus={focus('account_number')}
            onBlur={blur}
          />
          <ToggleRow
            label="Bank Verification"
            statusOn="Verified"
            statusOff="Not verified"
            value={form.bank_verified}
            onValueChange={(v) => update('bank_verified', v)}
          />
        </SectionCard>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnCancel, saving && styles.btnDisabled]}
            onPress={() => setForm(emptyForm)}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.btnCancelText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSave, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnSaveText}>Save Farmer</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },

  // Card
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    backgroundColor: T.headerTint,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: T.primary,
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },

  // Profile picture
  uploadZone: {
    backgroundColor: T.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  uploadZoneText: {
    fontSize: 13,
    color: T.textMuted,
  },
  profileSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profilePreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: T.border,
  },
  profileSelectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
  },
  profileRemoveText: {
    fontSize: 12,
    color: T.danger,
    marginTop: 4,
  },

  // Labeled input
  inputWrapper: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: T.text,
  },
  inputFocused: {
    borderColor: T.primary,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
  },
  toggleStatus: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textMuted,
  },
  btnSave: {
    flex: 1,
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});