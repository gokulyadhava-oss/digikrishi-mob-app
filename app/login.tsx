import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, useTheme, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SCREENS = {
  HOME: 'home',
  FARMER_PHONE: 'farmer_phone',
  FARMER_OTP: 'farmer_otp',
  AGENT_LOGIN: 'agent_login',
} as const;

type Screen = (typeof SCREENS)[keyof typeof SCREENS];

export default function LoginScreen() {
  const [screen, setScreen] = useState<Screen>(SCREENS.HOME);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const requestInFlightRef = useRef(false);
  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  const { login, loginWithFarmerOtp, requestFarmerOtp, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme() ?? 'dark';
  const emerald = Colors[colorScheme].primary ?? '#4a9240';
  const surface = theme.colors.surface;
  const onSurface = theme.colors.onSurface;
  const onSurfaceVariant = theme.colors.onSurfaceVariant;
  const borderColor = Colors[colorScheme].emeraldBorder ?? theme.colors.outline;

  const handlePhoneChange = (val: string) => {
    setError('');
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Enter valid 10-digit number');
      return;
    }
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setError('');
    setSendingOtp(true);
    try {
      await requestFarmerOtp(phone);
      setSendingOtp(false);
      setScreen(SCREENS.FARMER_OTP);
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
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter 6-digit OTP');
      return;
    }
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
    if (!email.trim() || !password) {
      setError('Enter email and password');
      return;
    }
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
    if (screen === SCREENS.FARMER_PHONE) setScreen(SCREENS.HOME);
    else if (screen === SCREENS.FARMER_OTP) setScreen(SCREENS.FARMER_PHONE);
    else if (screen === SCREENS.AGENT_LOGIN) setScreen(SCREENS.HOME);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}>
        <View style={[styles.card, { backgroundColor: surface, borderColor }]}>

          {/* ── HOME ── */}
          {screen === SCREENS.HOME && (
            <>
              <View style={styles.logoWrap}>
                <Image
                  source={require('@/assets/images/digi-prishi-logo.webp')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text variant="headlineMedium" style={[styles.title, { color: onSurface }]}>
                Digi Krishi
              </Text>
              <Text variant="bodyMedium" style={[styles.subtitle, { color: onSurfaceVariant }]}>
                For farmers
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setPhone(''); setError(''); setScreen(SCREENS.FARMER_PHONE); }}
                style={[styles.farmerCard, { borderColor: emerald }]}>
                <Text variant="headlineSmall" style={[styles.farmerCardTitle, { color: onSurface }]}>
                  I'm a Farmer
                </Text>
                <Text variant="bodyMedium" style={[styles.farmerCardSubtitle, { color: onSurfaceVariant }]}>
                  Login with your phone number. We'll send you a one-time password (OTP).
                </Text>
                <View style={[styles.farmerCardCta, { backgroundColor: emerald }]}>
                  <Text variant="labelLarge" style={styles.farmerCardCtaText}>Continue with phone</Text>
                  <Text variant="titleMedium" style={styles.farmerCardCtaText}>→</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setEmail(''); setPassword(''); setError(''); setScreen(SCREENS.AGENT_LOGIN); }}
                style={styles.agentRow}>
                <Text variant="bodyMedium" style={{ color: onSurfaceVariant }}>Agent? </Text>
                <Text variant="bodyMedium" style={{ color: emerald, fontWeight: '600' }}>Sign in with email & password</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── FARMER PHONE ── */}
          {screen === SCREENS.FARMER_PHONE && (
            <>
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text variant="titleLarge" style={{ color: onSurfaceVariant }}>←</Text>
              </TouchableOpacity>
              <Text variant="headlineSmall" style={[styles.screenTitle, { color: onSurface }]}>
                Enter phone number
              </Text>
              <Text variant="bodyMedium" style={[styles.screenSubtitle, { color: onSurfaceVariant }]}>
                We'll generate an OTP for this number (if registered).
              </Text>
              <TextInput
                label="Phone number (India +91)"
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="10-digit mobile number"
                mode="outlined"
                keyboardType="phone-pad"
                maxLength={10}
                disabled={sendingOtp}
                style={styles.phoneInput}
              />
              <TouchableOpacity
                onPress={() => { handlePhoneChange('9577973632'); setError(''); }}
                style={[styles.phoneAutocomplete, { borderColor: onSurfaceVariant }]}
                activeOpacity={0.7}>
                <Text variant="bodySmall" style={{ color: onSurfaceVariant }}>Use: 9577973632</Text>
              </TouchableOpacity>
              {error ? <Text variant="bodySmall" style={styles.errText}>{error}</Text> : null}
              <Button
                mode="contained"
                onPress={handleSendOtp}
                disabled={phone.length !== 10 || sendingOtp}
                loading={sendingOtp}
                style={styles.primaryBtn}>
                {sendingOtp ? 'Sending…' : 'Generate OTP'}
              </Button>
            </>
          )}

          {/* ── FARMER OTP ── */}
          {screen === SCREENS.FARMER_OTP && (
            <>
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text variant="titleLarge" style={{ color: onSurfaceVariant }}>←</Text>
              </TouchableOpacity>
              <Text variant="headlineSmall" style={[styles.screenTitle, { color: onSurface }]}>
                Enter OTP
              </Text>
              <Text variant="bodyMedium" style={[styles.screenSubtitle, { color: onSurfaceVariant }]}>
                Sent to +91 {phone} · Valid for 5 minutes
              </Text>
              <View style={styles.otpRow}>
                {otp.map((d, i) => (
                  <RNTextInput
                    key={i}
                    ref={(r) => { otpRefs.current[i] = r; }}
                    value={d}
                    onChangeText={(val) => handleOtpChange(i, val)}
                    onKeyPress={(e) => handleOtpKey(i, e)}
                    maxLength={1}
                    keyboardType="number-pad"
                    style={[
                      styles.otpBox,
                      { borderColor: d ? emerald : borderColor, color: onSurface },
                    ]}
                    placeholder=""
                    placeholderTextColor={onSurfaceVariant}
                  />
                ))}
              </View>
              {error ? <Text variant="bodySmall" style={[styles.errText, styles.errCenter]}>{error}</Text> : null}
              <Button
                mode="contained"
                onPress={handleVerifyOtp}
                disabled={otp.join('').length !== 6 || isLoading}
                style={styles.primaryBtn}>
                {isLoading ? 'Verifying…' : 'Verify & Login'}
              </Button>
            </>
          )}

          {/* ── AGENT LOGIN ── */}
          {screen === SCREENS.AGENT_LOGIN && (
            <>
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Text variant="titleLarge" style={{ color: onSurfaceVariant }}>←</Text>
              </TouchableOpacity>
              <Text variant="headlineSmall" style={[styles.screenTitle, { color: onSurface }]}>
                Agent login
              </Text>
              <Text variant="bodyMedium" style={[styles.screenSubtitle, { color: onSurfaceVariant }]}>
                Email and password
              </Text>
              <TextInput
                label="Email"
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder="agent@example.com"
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                disabled={isLoading}
                style={styles.input}
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                placeholder="••••••••"
                mode="outlined"
                secureTextEntry={!passwordVisible}
                autoComplete="password"
                disabled={isLoading}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? 'eye-off' : 'eye'}
                    onPress={() => setPasswordVisible((v) => !v)}
                    forceTextInputFocus={false}
                  />
                }
              />
              {error ? <Text variant="bodySmall" style={styles.errText}>{error}</Text> : null}
              <Button
                mode="contained"
                onPress={handleAgentLogin}
                disabled={isLoading}
                style={styles.primaryBtn}>
                Login
              </Button>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 16 },
  farmerCard: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 8,
    backgroundColor: 'rgba(74,146,64,0.08)',
  },
  farmerCardTitle: { marginBottom: 8 },
  farmerCardSubtitle: { marginBottom: 18, lineHeight: 20 },
  farmerCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  farmerCardCtaText: { color: '#fff' },
  agentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  screenTitle: { marginBottom: 4 },
  screenSubtitle: { marginBottom: 20 },
  phoneInput: { marginBottom: 0 },
  phoneAutocomplete: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errText: { color: '#d32f2f', marginBottom: 4 },
  errCenter: { textAlign: 'center' },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginVertical: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: { marginBottom: 0 },
  primaryBtn: { marginTop: 8 },
});
