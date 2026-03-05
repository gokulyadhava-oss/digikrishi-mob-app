import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOADING_DURATION_MS = 3000;
const BRAND_COLOR = '#5EE890';
const BRAND_DIM = 'rgba(94,232,144,0.55)';
const SOIL_DARK = '#060E08';
const SUBTLE = 'rgba(224,255,236,0.38)';

export function LoadingScreen({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(1, { duration: LOADING_DURATION_MS });
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setPct(Math.min(100, Math.round((elapsed / LOADING_DURATION_MS) * 100)));
    }, 50);
    const t = setTimeout(() => {
      clearInterval(interval);
      setPct(100);
      opacity.value = withTiming(0, { duration: 280 }, (finished) => {
        if (finished) runOnJS(setDone)(true);
      });
    }, LOADING_DURATION_MS);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (done) onFinish();
  }, [done, onFinish]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (done) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="box-none">
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/logo-without-bg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.brandTag}>AgriTech Platform</Text>
          <Text style={styles.brandName}>Digi Krishi</Text>
          <View style={styles.divider} />
          <Text style={styles.brandSub}>Grow Smarter · Grow Digital</Text>
        </View>
        <View style={styles.loaderWrap}>
          <View style={styles.loaderHeader}>
            <Text style={styles.loaderLabel}>Loading</Text>
            <Text style={styles.loaderPct}>{pct}%</Text>
          </View>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, barStyle]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SOIL_DARK,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH * 0.9,
  },
  logoWrap: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  titleBlock: {
    marginTop: 24,
    alignItems: 'center',
    gap: 6,
  },
  brandTag: {
    fontSize: 10,
    letterSpacing: 3,
    color: BRAND_DIM,
    textTransform: 'uppercase',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    color: BRAND_COLOR,
    textTransform: 'uppercase',
  },
  divider: {
    width: 100,
    height: 1,
    backgroundColor: 'rgba(61,184,106,0.5)',
    marginVertical: 4,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 2,
    color: SUBTLE,
    textTransform: 'uppercase',
  },
  loaderWrap: {
    marginTop: 32,
    width: 120,
  },
  loaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  loaderLabel: {
    fontSize: 11,
    color: BRAND_DIM,
    letterSpacing: 1,
  },
  loaderPct: {
    fontSize: 11,
    color: BRAND_COLOR,
    fontWeight: '700',
  },
  loaderTrack: {
    height: 3,
    backgroundColor: 'rgba(61,184,106,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loaderFill: {
    height: '100%',
    backgroundColor: BRAND_COLOR,
    borderRadius: 2,
  },
});
