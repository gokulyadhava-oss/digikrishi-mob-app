import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  type FarmerPlotPayload,
  PLOT_SEASON,
  PLOT_UNITS,
  PLOT_SOWING_METHOD,
  PLOT_PLANTING_MATERIAL,
  PLOT_FARMING_TYPE,
  PLOT_IRRIGATION_METHOD,
  PLOT_VARIETY,
} from '@/lib/api';
import {
  fetchPlacePredictions,
  fetchPlaceDetails,
  type PlacePrediction,
} from '@/lib/google-places';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const emptyForm: FarmerPlotPayload = {
  season: null,
  variety: null,
  sowing_date: null,
  units: null,
  land_size_value: null,
  sowing_method: null,
  planting_material: null,
  farming_type: null,
  irrigation_method: null,
  address: null,
  pincode: null,
  taluka: null,
  district: null,
};

type Step = 1 | 2;

interface PlotFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: FarmerPlotPayload) => Promise<void>;
}

export function PlotFormModal({ visible, onClose, onSave }: PlotFormModalProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FarmerPlotPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerOptions, setPickerOptions] = useState<readonly string[]>([]);
  const [pickerKey, setPickerKey] = useState<keyof FarmerPlotPayload | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [placesModalOpen, setPlacesModalOpen] = useState(false);
  const [placesQuery, setPlacesQuery] = useState('');
  const [placesPredictions, setPlacesPredictions] = useState<PlacePrediction[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesDetailsLoading, setPlacesDetailsLoading] = useState(false);
  const placesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sowingDateAsDate = form.sowing_date
    ? (() => {
        const [y, m, d] = form.sowing_date!.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      })()
    : undefined;

  const onDismissDate = useCallback(() => setDatePickerOpen(false), []);
  const onConfirmDate = useCallback(
    (params: { date: Date | undefined }) => {
      setDatePickerOpen(false);
      if (params.date) {
        const d = params.date;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        update('sowing_date', `${yyyy}-${mm}-${dd}`);
      }
    },
    []
  );

  const update = (key: keyof FarmerPlotPayload, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openPicker = (key: keyof FarmerPlotPayload, options: readonly string[]) => {
    setPickerKey(key);
    setPickerOptions([...options]);
    setPickerOpen(true);
  };

  useEffect(() => {
    if (!placesModalOpen) return;
    if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
    if (placesQuery.trim().length < 2) {
      setPlacesPredictions([]);
      setPlacesLoading(false);
      return;
    }
    setPlacesLoading(true);
    placesDebounceRef.current = setTimeout(async () => {
      placesDebounceRef.current = null;
      try {
        const list = await fetchPlacePredictions(placesQuery, { country: 'in' });
        setPlacesPredictions(list);
      } catch (e) {
        setPlacesPredictions([]);
        if (placesModalOpen) {
          Alert.alert('Auto fill', e instanceof Error ? e.message : 'Search failed. Check API key has Places API enabled.');
        }
      } finally {
        setPlacesLoading(false);
      }
    }, 300);
    return () => {
      if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
    };
  }, [placesModalOpen, placesQuery]);

  const handleSelectPlace = useCallback(async (placeId: string) => {
    setPlacesDetailsLoading(true);
    try {
      const parsed = await fetchPlaceDetails(placeId);
      setForm((prev) => ({
        ...prev,
        address: parsed.address,
        pincode: parsed.pincode,
        taluka: parsed.taluka,
        district: parsed.district,
      }));
      setPlacesModalOpen(false);
      setPlacesQuery('');
      setPlacesPredictions([]);
    } catch (e) {
      Alert.alert('Auto fill', e instanceof Error ? e.message : 'Could not get address details.');
    } finally {
      setPlacesDetailsLoading(false);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setForm(emptyForm);
      setStep(1);
      onClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save plot');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(emptyForm);
    setStep(1);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.box, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text variant="titleMedium">
              {step === 1 ? 'Plot – Crop & land' : 'Plot – Address'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {step === 1 && (
              <>
                <FieldLabel label="Season" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('season', PLOT_SEASON)}>
                  <Text style={{ color: form.season ? colors.text : colors.mutedForeground }}>
                    {form.season ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <FieldLabel label="Variety" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('variety', PLOT_VARIETY)}>
                  <Text style={{ color: form.variety ? colors.text : colors.mutedForeground }} numberOfLines={1}>
                    {form.variety ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <FieldLabel label="Sowing Date" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => setDatePickerOpen(true)}>
                  <Text style={{ color: form.sowing_date ? colors.text : colors.mutedForeground }}>
                    {form.sowing_date ?? 'Select date'}
                  </Text>
                </TouchableOpacity>
                <DatePickerModal
                  locale="en"
                  mode="single"
                  visible={datePickerOpen}
                  onDismiss={onDismissDate}
                  date={sowingDateAsDate}
                  onConfirm={onConfirmDate}
                />
                <FieldLabel label="Units" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('units', PLOT_UNITS)}>
                  <Text style={{ color: form.units ? colors.text : colors.mutedForeground }}>
                    {form.units ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <FieldLabel label="Land Size Value" />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  value={form.land_size_value != null ? String(form.land_size_value) : ''}
                  onChangeText={(v) => update('land_size_value', v ? parseFloat(v) || null : null)}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2.5"
                  placeholderTextColor={colors.mutedForeground}
                />
                <FieldLabel label="Sowing Method" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('sowing_method', PLOT_SOWING_METHOD)}>
                  <Text style={{ color: form.sowing_method ? colors.text : colors.mutedForeground }}>
                    {form.sowing_method ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <FieldLabel label="Planting Material" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('planting_material', PLOT_PLANTING_MATERIAL)}>
                  <Text style={{ color: form.planting_material ? colors.text : colors.mutedForeground }}>
                    {form.planting_material ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <FieldLabel label="Farming Type" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('farming_type', PLOT_FARMING_TYPE)}>
                  <Text style={{ color: form.farming_type ? colors.text : colors.mutedForeground }}>
                    {form.farming_type ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <FieldLabel label="Irrigation Method" />
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border }]}
                  onPress={() => openPicker('irrigation_method', PLOT_IRRIGATION_METHOD)}>
                  <Text style={{ color: form.irrigation_method ? colors.text : colors.mutedForeground }}>
                    {form.irrigation_method ?? 'Select'}
                  </Text>
                </TouchableOpacity>
                <Button mode="contained" onPress={() => setStep(2)} style={styles.nextBtn}>
                  Next
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <TouchableOpacity
                  onPress={() => setPlacesModalOpen(true)}
                  style={[styles.autoFillBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}>
                  <IconSymbol name="mappin.circle.fill" size={20} color={colors.text} />
                  <Text style={[styles.autoFillBtnText, { color: colors.text }]}>Auto fill from map</Text>
                </TouchableOpacity>
                <FieldLabel label="Address" />
                <TextInput
                  style={[styles.input, styles.inputMultiline, { borderColor: colors.border, color: colors.text }]}
                  value={form.address ?? ''}
                  onChangeText={(v) => update('address', v || null)}
                  placeholder="Full address"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                />
                <FieldLabel label="Pincode" />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  value={form.pincode ?? ''}
                  onChangeText={(v) => update('pincode', v || null)}
                  placeholder="Pincode"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <FieldLabel label="Taluka" />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  value={form.taluka ?? ''}
                  onChangeText={(v) => update('taluka', v || null)}
                  placeholder="Taluka"
                  placeholderTextColor={colors.mutedForeground}
                />
                <FieldLabel label="District" />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  value={form.district ?? ''}
                  onChangeText={(v) => update('district', v || null)}
                  placeholder="District"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.rowButtons}>
                  <Button mode="outlined" onPress={() => setStep(1)} style={styles.halfBtn}>
                    Back
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={styles.halfBtn}>
                    Save
                  </Button>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerOpen(false)}>
          <View style={[styles.pickerBox, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.pickerScroll}>
              {pickerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pickerItem, { borderColor: colors.border }]}
                  onPress={() => {
                    if (pickerKey) update(pickerKey, opt);
                    setPickerOpen(false);
                    setPickerKey(null);
                  }}>
                  <Text>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button onPress={() => setPickerOpen(false)}>Cancel</Button>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={placesModalOpen} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => !placesDetailsLoading && setPlacesModalOpen(false)}>
          <Pressable style={[styles.placesBox, { backgroundColor: colors.background }]} onPress={() => {}}>
            <Text style={[styles.placesTitle, { color: colors.text }]}>Search address</Text>
            <TextInput
              style={[styles.input, styles.placesInput, { borderColor: colors.border, color: colors.text }]}
              value={placesQuery}
              onChangeText={setPlacesQuery}
              placeholder="Type village, city or full address…"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              editable={!placesDetailsLoading}
            />
            {placesDetailsLoading ? (
              <View style={styles.placesLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: 8 }}>Getting address…</Text>
              </View>
            ) : placesLoading ? (
              <View style={styles.placesLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.placesList} keyboardShouldPersistTaps="handled">
                {placesPredictions.map((p) => (
                  <TouchableOpacity
                    key={p.place_id}
                    style={[styles.pickerItem, { borderColor: colors.border }]}
                    onPress={() => handleSelectPlace(p.place_id)}>
                    <Text style={{ color: colors.text }} numberOfLines={2}>{p.description}</Text>
                  </TouchableOpacity>
                ))}
                {placesQuery.trim().length >= 2 && !placesLoading && placesPredictions.length === 0 && (
                  <Text style={[styles.placesEmpty, { color: colors.mutedForeground }]}>No results</Text>
                )}
              </ScrollView>
            )}
            <Button onPress={() => setPlacesModalOpen(false)} disabled={placesDetailsLoading}>Cancel</Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text variant="bodySmall" style={styles.fieldLabel}>{label}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    maxHeight: '92%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  scroll: { maxHeight: 610, padding: 16 },
  fieldLabel: { marginTop: 12, marginBottom: 4 },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  autoFillBtnText: { fontSize: 15, fontWeight: '600' },
  placesBox: {
    borderRadius: 12,
    maxHeight: 420,
    marginHorizontal: 24,
    padding: 16,
  },
  placesTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  placesInput: { marginBottom: 12 },
  placesLoading: { paddingVertical: 24, alignItems: 'center' },
  placesList: { maxHeight: 220 },
  placesEmpty: { padding: 16, textAlign: 'center' },
  select: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 60 },
  nextBtn: { marginTop: 20 },
  rowButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  halfBtn: { flex: 1 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerBox: {
    borderRadius: 12,
    maxHeight: 320,
  },
  pickerScroll: { maxHeight: 260 },
  pickerItem: {
    padding: 14,
    borderBottomWidth: 1,
  },
});
