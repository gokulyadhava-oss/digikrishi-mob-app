import { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, TouchableOpacity, TextInput as RNTextInput, ScrollView } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const DOODLE_HEIGHT = 180;

// ─── Environment doodle ───────────────────────────────────────────────────────
function FarmerDoodle() {
  return (
    <Image
      source={{
        uri: 'https://568a6n8a8z.ucarecd.net/035ce705-94df-41de-bcfd-31d01b89142e/_4.jpeg',
      }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
    />
  );
}

// ─── Screen names ──────────────────────────────────────────────────────────────
const SCREENS = {
  PHONE: 'phone',
  OTP:   'otp',
  AGENT: 'agent',
} as const;
type Screen = (typeof SCREENS)[keyof typeof SCREENS];

// ─── Main component ────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [screen, setScreen]                   = useState<Screen>(SCREENS.PHONE);
  const [phone, setPhone]                     = useState('');
  const [otp, setOtp]                         = useState(['', '', '', '', '', '']);
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError]                     = useState('');
  const [sendingOtp, setSendingOtp]           = useState(false);
  const requestInFlightRef                    = useRef(false);
  const otpRefs                               = useRef<(RNTextInput | null)[]>([]);
  const scrollRef                             = useRef<ScrollView | null>(null);

  const { login, loginWithFarmerOtp, requestFarmerOtp, isLoading } = useAuth();
  const router = useRouter();
  const theme  = useTheme();
  const onSurface        = theme.colors.onSurface;
  const onSurfaceVariant = theme.colors.onSurfaceVariant;

  const handlePhoneChange = (val: string) => {
    setError('');
    setPhone(val.replace(/\D/g, '').slice(0, 10));
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setError('');
    setSendingOtp(true);
    try {
      await requestFarmerOtp(phone);
      setScreen(SCREENS.OTP);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send OTP';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setSendingOtp(false);
      requestInFlightRef.current = false;
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0)
      otpRefs.current[i - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setError('');
    try {
      await loginWithFarmerOtp(phone, code);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid or expired OTP';
      setError(msg);
      Alert.alert('Login failed', msg);
    }
  };

  const handleAgentLogin = async () => {
    if (!email.trim() || !password) { setError('Enter email and password'); return; }
    setError('');
    try {
      await login(email.trim(), password, 'FIELD_OFFICER');
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setError(msg);
      Alert.alert('Login failed', msg);
    }
  };

  const goBack = () => {
    setError('');
    if (screen === SCREENS.OTP)   { setOtp(['','','','','','']); setScreen(SCREENS.PHONE); }
    if (screen === SCREENS.AGENT) { setScreen(SCREENS.PHONE); }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Doodle banner: SVG fills behind, logo pill centred in front ── */}
          <View style={[styles.doodleWrap, { height: DOODLE_HEIGHT }]}>
            {/* SVG fills entire banner behind */}
            <View style={styles.svgAbsolute}>
              <FarmerDoodle />
            </View>

            {/* Logo pill is in normal flow, centred via alignItems */}
            <View style={styles.logoPill}>
              <Image
                source={require('@/assets/images/digi-prishi-logo.webp')}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <Text variant="titleMedium" style={styles.logoText}>
                Digi Krishi
              </Text>
            </View>
          </View>

          {/* ── Card ─────────────────────────────────────────────────────── */}
          <View style={styles.card}>

            {screen !== SCREENS.PHONE && (
              <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
                <Text variant="titleLarge" style={{ color: onSurfaceVariant }}>←</Text>
              </TouchableOpacity>
            )}

            {/* ══ PHONE ════════════════════════════════════════════════════ */}
            {screen === SCREENS.PHONE && (
              <>
                <Text variant="headlineMedium" style={[styles.title, { color: onSurface }]}>
                  Welcome 👋
                </Text>
                <Text variant="bodyMedium" style={[styles.subtitle, { color: onSurfaceVariant }]}>
                  Enter your phone number to get started
                </Text>

                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text variant="bodyLarge" style={[styles.prefixText, { color: onSurface }]}>
                      🇮🇳  +91
                    </Text>
                  </View>
                  <RNTextInput
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!sendingOtp}
                    style={[styles.phoneInput, { color: onSurface }]}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => { handlePhoneChange('9577973632'); setError(''); }}
                  style={styles.quickChip}
                  activeOpacity={0.7}
                >
                  <Text variant="bodySmall" style={{ color: onSurfaceVariant }}>
                    Use: 9577973632
                  </Text>
                </TouchableOpacity>

                {error ? <Text variant="bodySmall" style={styles.errText}>{error}</Text> : null}

                <Button
                  mode="contained"
                  onPress={handleSendOtp}
                  disabled={phone.length !== 10 || sendingOtp}
                  loading={sendingOtp}
                  style={styles.primaryBtn}
                  contentStyle={styles.btnContent}
                >
                  {sendingOtp ? 'Sending…' : 'Send OTP'}
                </Button>

                <TouchableOpacity
                  onPress={() => { setEmail(''); setPassword(''); setError(''); setScreen(SCREENS.AGENT); }}
                  style={styles.agentLink}
                  activeOpacity={0.7}
                >
                  <Text variant="bodySmall" style={{ color: onSurfaceVariant }}>
                    Field agent?{' '}
                    <Text variant="bodySmall" style={{ color: Colors.primary, fontWeight: '600' }}>
                      Sign in here →
                    </Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ══ OTP ══════════════════════════════════════════════════════ */}
            {screen === SCREENS.OTP && (
              <>
                <Text variant="headlineSmall" style={[styles.title, { color: onSurface }]}>
                  Enter OTP
                </Text>
                <Text variant="bodyMedium" style={[styles.subtitle, { color: onSurfaceVariant }]}>
                  Sent to +91 {phone} · Valid for 5 min
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((d, i) => (
                    <RNTextInput
                      key={i}
                      ref={(r) => { otpRefs.current[i] = r; }}
                      value={d}
                      onChangeText={(val) => handleOtpChange(i, val)}
                      onKeyPress={(e) => handleOtpKey(i, e)}
                      onFocus={() => {
                        // Ensure OTP row is visible above the keyboard
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }}
                      maxLength={1}
                      keyboardType="number-pad"
                      style={[
                        styles.otpBox,
                        {
                          borderColor: d ? Colors.primary : Colors.border,
                          color: onSurface,
                          backgroundColor: d ? Colors.primary + '12' : Colors.bg,
                        },
                      ]}
                    />
                  ))}
                </View>

                {error ? (
                  <Text variant="bodySmall" style={[styles.errText, { textAlign: 'center' }]}>
                    {error}
                  </Text>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleVerifyOtp}
                  disabled={otp.join('').length !== 6 || isLoading}
                  loading={isLoading}
                  style={styles.primaryBtn}
                  contentStyle={styles.btnContent}
                >
                  {isLoading ? 'Verifying…' : 'Verify & Login'}
                </Button>

                <TouchableOpacity onPress={goBack} style={styles.agentLink} activeOpacity={0.7}>
                  <Text variant="bodySmall" style={{ color: Colors.primary, fontWeight: '600', textAlign: 'center' }}>
                    Didn't receive it? Resend OTP
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ══ AGENT ════════════════════════════════════════════════════ */}
            {screen === SCREENS.AGENT && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="face-agent" size={28} color={Colors.primary} />
                  <Text variant="headlineSmall" style={[styles.title, { color: onSurface }]}>
                    Agent login
                  </Text>
                </View>
                <Text variant="bodyMedium" style={[styles.subtitle, { color: onSurfaceVariant }]}>
                  Email and password
                </Text>

                <View style={styles.phoneRow}>
                  <RNTextInput
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(''); }}
                    placeholder="agent@example.com"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!isLoading}
                    style={[styles.phoneInput, { color: onSurface, flex: 1 }]}
                  />
                </View>

                <View style={styles.phoneRow}>
                  <RNTextInput
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(''); }}
                    placeholder="Password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!passwordVisible}
                    autoComplete="password"
                    editable={!isLoading}
                    style={[styles.phoneInput, { color: onSurface, flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={() => setPasswordVisible(v => !v)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 18, opacity: 0.5 }}>
                      {passwordVisible ? '🙈' : '👁'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {error ? <Text variant="bodySmall" style={styles.errText}>{error}</Text> : null}

                <Button
                  mode="contained"
                  onPress={handleAgentLogin}
                  disabled={isLoading}
                  loading={isLoading}
                  style={styles.primaryBtn}
                  contentStyle={styles.btnContent}
                >
                  Login
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E6F4EA',
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  // ── Doodle banner ──
  doodleWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  svgAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ── Logo pill — centred horizontally over the doodle ──
  logoPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 5,
  },
  logoImg: {
    width: 40,
    height: 30,
    borderRadius: 8,
  },
  logoText: {
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // ── Card ──
  card: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 28,
    padding: 24,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },

  title:    { fontWeight: '800' },
  subtitle: { lineHeight: 20 },

  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 2,
  },

  // ── Inputs ──
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 13,
    backgroundColor: Colors.bg,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  prefixText: { fontWeight: '600' },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 12 },
  quickChip: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ── OTP ──
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 6,
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 13,
    borderWidth: 2,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Buttons ──
  primaryBtn:  { marginTop: 2, borderRadius: 14 },
  btnContent:  { paddingVertical: 6 },
  agentLink:   { alignItems: 'center', paddingVertical: 4 },

  errText: { color: Colors.danger },
});