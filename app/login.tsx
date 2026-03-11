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
  ScrollView,
} from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import Svg, { Path, Circle, Line, Ellipse, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// ─── Farmer doodle ────────────────────────────────────────────────────────────
function FarmerDoodle() {
  const stroke = Colors.primaryDark;
  const green  = Colors.primary;
  const lime   = Colors.secondary;
  const limeL  = Colors.secondaryLight;
  const muted  = '#9EC9A4';
  const skin   = '#F9D0A0';
  const border = '#D4956A';

  return (
    <Svg viewBox="0 0 360 170" width="100%" height="100%">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#DFF0E4" />
          <Stop offset="100%" stopColor={Colors.bg} />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="170" fill="url(#sky)" />

      {/* Hills */}
      <Path d="M0 120 Q55 85 115 108 Q175 130 240 100 Q295 72 360 95 L360 170 L0 170Z"
        fill="#C8E6C9" fillOpacity={0.45} />
      <Path d="M0 145 Q80 132 170 140 Q260 148 360 136 L360 170 L0 170Z"
        fill="#E4F0E6" />
      <Path d="M0 152 Q90 146 180 150 Q270 154 360 148"
        stroke="#B0D4B4" strokeWidth={1.2} fill="none" strokeLinecap="round" />

      {/* Sun */}
      <Circle cx={38} cy={32} r={12} stroke={limeL} strokeWidth={1.8} fill="white" fillOpacity={0.7} />
      {[0,45,90,135,180,225,270,315].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return <Line key={i}
          x1={38 + 16 * Math.cos(rad)} y1={32 + 16 * Math.sin(rad)}
          x2={38 + 21 * Math.cos(rad)} y2={32 + 21 * Math.sin(rad)}
          stroke={limeL} strokeWidth={1.4} strokeLinecap="round" />;
      })}

      {/* Cloud */}
      <Ellipse cx={290} cy={38} rx={18} ry={9} fill="white" fillOpacity={0.7} stroke="#C8E6C9" strokeWidth={1} />
      <Ellipse cx={304} cy={34} rx={13} ry={8} fill="white" fillOpacity={0.8} stroke="#C8E6C9" strokeWidth={1} />
      <Ellipse cx={277} cy={36} rx={11} ry={7} fill="white" fillOpacity={0.75} stroke="#C8E6C9" strokeWidth={1} />

      {/* Birds */}
      <Path d="M68 55 Q71 52 74 55" stroke={muted} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Path d="M78 50 Q81 47 84 50" stroke={muted} strokeWidth={1.2} fill="none" strokeLinecap="round" />

      {/* Fence */}
      {[0,1,2,3].map(i => (
        <Line key={i} x1={52 + i * 18} y1={145} x2={52 + i * 18} y2={158}
          stroke="#B0D4B4" strokeWidth={1.5} strokeLinecap="round" />
      ))}
      <Line x1={52} y1={149} x2={106} y2={149} stroke="#B0D4B4" strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={52} y1={154} x2={106} y2={154} stroke="#B0D4B4" strokeWidth={1.2} strokeLinecap="round" />

      {/* Crops */}
      {[0,1,2,3,4,5].map(i => (
        <Path key={i}
          d={`M${210+i*20} 155 L${210+i*20} 134 M${210+i*20} 144 Q${203+i*20} 138 ${205+i*20} 133 M${210+i*20} 141 Q${217+i*20} 136 ${215+i*20} 131`}
          stroke={i % 2 === 0 ? Colors.primaryLight : lime}
          strokeWidth={1.3} fill="none" strokeLinecap="round" />
      ))}

      {/* Basket */}
      <Path d="M92 158 Q93 152 100 152 Q107 152 108 158Z" stroke="#A67C25" strokeWidth={1.2} fill="#D4A84330" />
      <Line x1={91} y1={158} x2={109} y2={158} stroke="#A67C25" strokeWidth={1.4} strokeLinecap="round" />

      {/* ── Main farmer ── */}
      <Line x1={112} y1={164} x2={119} y2={164} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={127} y1={164} x2={134} y2={164} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={120} y1={153} x2={116} y2={164} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1={126} y1={153} x2={130} y2={164} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M116 130 L116 153 Q118 154 123 154 Q128 154 130 153 L130 130"
        stroke={green} strokeWidth={2} fill={Colors.primaryLight} fillOpacity={0.18}
        strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M116 136 Q107 140 102 148" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={102} y1={148} x2={96} y2={158} stroke={green} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={91} y1={157} x2={101} y2={157} stroke={green} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M130 136 Q137 133 140 128" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={141} cy={127} r={3} fill={skin} stroke={border} strokeWidth={0.8} />
      <Line x1={123} y1={120} x2={123} y2={128} stroke={skin} strokeWidth={2.5} />
      <Circle cx={123} cy={114} r={10} fill={skin} stroke={border} strokeWidth={1.5} />
      <Circle cx={120} cy={113} r={1} fill="#2A1810" />
      <Circle cx={126} cy={113} r={1} fill="#2A1810" />
      <Path d="M119 117 Q123 120 127 117" stroke="#2A1810" strokeWidth={1} fill="none" strokeLinecap="round" />
      <Path d="M112 109 Q113 108 123 108 Q133 108 134 109" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M115 109 Q115 100 123 100 Q131 100 131 109"
        stroke={stroke} strokeWidth={1.8} fill={green} fillOpacity={0.35} strokeLinejoin="round" />
      <Line x1={115} y1={107} x2={131} y2={107} stroke={lime} strokeWidth={1.2} />

      {/* ── Background farmer ── */}
      <Line x1={165} y1={140} x2={165} y2={152} stroke="#607060" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={165} cy={135} r={6.5} fill={skin} stroke={border} strokeWidth={1.2} />
      <Path d="M159 133 Q160 128 165 128 Q170 128 171 133"
        stroke={green} strokeWidth={1.5} fill={Colors.primaryLight} fillOpacity={0.25} />
      <Line x1={160} y1={133} x2={170} y2={133} stroke={green} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={163} cy={136} r={0.7} fill="#2A1810" />
      <Circle cx={167} cy={136} r={0.7} fill="#2A1810" />
      <Path d="M162 139 Q165 141 168 139" stroke="#2A1810" strokeWidth={0.9} fill="none" strokeLinecap="round" />
      <Path d="M160 143 Q157 146 155 150" stroke="#607060" strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M170 143 Q173 146 172 149" stroke="#607060" strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={162} y1={152} x2={158} y2={158} stroke="#607060" strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={168} y1={152} x2={171} y2={158} stroke="#607060" strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
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

  const { login, loginWithFarmerOtp, requestFarmerOtp, isLoading } = useAuth();
  const router = useRouter();
  const theme  = useTheme();
  const onSurface        = theme.colors.onSurface;
  const onSurfaceVariant = theme.colors.onSurfaceVariant;

  // ── handlers ────────────────────────────────────────────────────────────────
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

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Doodle (lateral, from top) ────────────────────────────────── */}
          <View style={styles.doodleWrap}>
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
            <View style={styles.doodleBox}>
              <FarmerDoodle />
            </View>
          </View>

          {/* ── Card ─────────────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Back — OTP & Agent only */}
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

                {/* Agent — small, quiet, at the bottom */}
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
    backgroundColor: Colors.bg,
  },
  kav: {
    flex: 1,
  },
  // justifyContent: 'center' keeps the whole block centred vertically,
  // paddingTop nudges everything slightly above true centre
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 24,
  },

  // ── Doodle (lateral, from top) ──
  doodleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: Colors.bg,
    minHeight: 140,
  },
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  doodleBox: {
    flex: 1,
    height: 120,
    marginLeft: 12,
  },
  logoImg: {
    width: 28,
    height: 28,
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
    marginTop: 28,        // room for the pill overhang
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