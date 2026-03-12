import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

// ─── Fresh Growth Design Tokens ───────────────────────────────────────────────
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
  border:        '#E4EDE6',
  headerTint:    '#EDF7EF',
  danger:        '#E05252',
  warning:       '#D97706',
  warningTint:   '#FFFBEB',
  warningBorder: '#FDE68A',
  gold:          '#F59E0B',
  blue:          '#2563EB',
  blueTint:      '#EFF6FF',
};

// ─── Activity type → icon + accent map ───────────────────────────────────────
const ACTIVITY_META: Record<string, { icon: string; accent: string; tint: string }> = {
  'Pest and Disease management': { icon: '🐛', accent: '#E05252', tint: '#FFF5F5' },
  'Chemical fertilizer application': { icon: '🧪', accent: '#7C3AED', tint: '#F5F3FF' },
  'Irrigation':                   { icon: '💧', accent: '#2563EB', tint: '#EFF6FF' },
  'Weed management':              { icon: '🌿', accent: '#059669', tint: '#ECFDF5' },
  'Bird damages protection':      { icon: '🐦', accent: '#D97706', tint: '#FFFBEB' },
  'Basal Dose':                   { icon: '🌱', accent: '#3D7A4F', tint: '#EDF7EF' },
  'Sowing of seeds':              { icon: '🌾', accent: '#82C341', tint: '#F0FFF4' },
  'Application of FYM / Compost & Fertilizers': { icon: '♻️', accent: '#78350F', tint: '#FEF3C7' },
  'Ploughing':                    { icon: '🚜', accent: '#92400E', tint: '#FFF7ED' },
  'Rate of the Yield':            { icon: '📊', accent: '#1D4ED8', tint: '#EFF6FF' },
  'Yield per acre':               { icon: '🏆', accent: '#B45309', tint: '#FFFBEB' },
};

function getActivityMeta(activity: string) {
  return ACTIVITY_META[activity] ?? { icon: '📋', accent: T.primary, tint: T.headerTint };
}

// ─── Advisory type ────────────────────────────────────────────────────────────
export type Advisory = {
  id: string;
  stage_name: string;
  activity: string;
  activity_time: string | null;
  start_day: number | null;
  end_day: number | null;
  specifications: { text: string } | null;
  steps: { text: string } | null;
  step_index: number;
  is_current_period: boolean;
};

// ─── Parse numbered list text into array ──────────────────────────────────────
function parseSteps(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// ─── Day label helper ─────────────────────────────────────────────────────────
function advisoryDayLabel(a: Advisory): string {
  if (a.start_day == null) return a.stage_name;
  if (a.start_day < 0) return `Pre-sowing (Day ${a.start_day} to ${a.end_day})`;
  if (a.start_day === a.end_day) return `Day ${a.start_day} — ${a.activity}`;
  return `Day ${a.start_day}–${a.end_day} — ${a.activity}`;
}

// ─── Animated Accordion ───────────────────────────────────────────────────────
function AccordionItem({ advisory, daysSinceSowing }: { advisory: Advisory; daysSinceSowing: number | null }) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const meta = getActivityMeta(advisory.activity);

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(rotateAnim, { toValue, useNativeDriver: true, speed: 18, bounciness: 2 }),
      Animated.timing(heightAnim, { toValue, duration: 260, useNativeDriver: false }),
    ]).start();
    setOpen(!open);
  };

  const chevronRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  // Is it upcoming or past?
  const isPast = daysSinceSowing != null && advisory.end_day != null && advisory.end_day < daysSinceSowing;
  const isUpcoming = daysSinceSowing != null && advisory.start_day != null && advisory.start_day > daysSinceSowing;

  const statusLabel = isPast ? 'Done' : isUpcoming ? 'Upcoming' : null;
  const statusColor = isPast ? T.textMuted : T.gold;
  const statusBg    = isPast ? T.border    : T.warningBorder + '88';

  const specLines = advisory.specifications?.text ? parseSteps(advisory.specifications.text) : [];
  const stepLines = advisory.steps?.text ? parseSteps(advisory.steps.text) : [];

  return (
    <View style={[
      styles.accordionWrap,
      isPast && styles.accordionWrapPast,
    ]}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.accordionHeader, pressed && { opacity: 0.82 }]}
      >
        {/* Left accent bar */}
        <View style={[styles.accordionAccentBar, { backgroundColor: isPast ? T.border : meta.accent }]} />

        {/* Icon badge */}
        <View style={[styles.accordionIconBadge, { backgroundColor: isPast ? T.bg : meta.tint }]}>
          <Text style={[styles.accordionIcon, isPast && { opacity: 0.45 }]}>{meta.icon}</Text>
        </View>

        {/* Title block */}
        <View style={styles.accordionTitleBlock}>
          <Text style={[styles.accordionDayLabel, isPast && styles.accordionDayLabelPast]}>
            {advisory.start_day != null
              ? advisory.start_day < 0
                ? `Pre-sowing`
                : `Day ${advisory.start_day}${advisory.end_day !== advisory.start_day ? `–${advisory.end_day}` : ''}`
              : advisory.stage_name}
          </Text>
          <Text style={[styles.accordionActivityLabel, isPast && styles.accordionActivityLabelPast]}
            numberOfLines={1}>
            {advisory.activity}
          </Text>
        </View>

        {/* Status pill + chevron */}
        <View style={styles.accordionRight}>
          {statusLabel && (
            <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusColor + '55' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          )}
          <Animated.Text style={[styles.accordionChevron, { transform: [{ rotate: chevronRotate }] }]}>
            ›
          </Animated.Text>
        </View>
      </Pressable>

      {/* Expanded body */}
      {open && (
        <View style={styles.accordionBody}>
          {/* Stage + timing row */}
          <View style={styles.accordionMetaRow}>
            <View style={[styles.accordionStagePill, { backgroundColor: meta.tint, borderColor: meta.accent + '44' }]}>
              <Text style={[styles.accordionStagePillText, { color: meta.accent }]}>{advisory.stage_name}</Text>
            </View>
            {advisory.activity_time && (
              <View style={styles.accordionTimePill}>
                <Text style={styles.accordionTimePillText}>🕐 {advisory.activity_time}</Text>
              </View>
            )}
          </View>

          {/* Specifications */}
          {specLines.length > 0 && (
            <View style={styles.accordionSection}>
              <Text style={styles.accordionSectionLabel}>SPECIFICATIONS</Text>
              {specLines.map((line, i) => (
                <View key={i} style={styles.accordionLine}>
                  <View style={[styles.accordionLineDot, { backgroundColor: meta.accent }]} />
                  <Text style={styles.accordionLineText}>{line.replace(/^\d+\.\s*/, '')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Steps */}
          {stepLines.length > 0 && (
            <View style={[styles.accordionSection, styles.accordionStepsSection]}>
              <Text style={styles.accordionSectionLabel}>STEPS</Text>
              {stepLines.map((line, i) => (
                <View key={i} style={styles.accordionStep}>
                  <View style={[styles.accordionStepNum, { backgroundColor: meta.accent }]}>
                    <Text style={styles.accordionStepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.accordionStepText}>{line.replace(/^\d+\.\s*/, '')}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Current Advisory Hero Card ───────────────────────────────────────────────
export function CurrentAdvisoryCard({ advisory }: { advisory: Advisory }) {
  const meta = getActivityMeta(advisory.activity);
  const specLines = advisory.specifications?.text ? parseSteps(advisory.specifications.text) : [];
  const stepLines = advisory.steps?.text ? parseSteps(advisory.steps.text) : [];

  return (
    <View style={styles.currentCard}>
      {/* Top stripe */}
      <View style={[styles.currentCardStripe, { backgroundColor: T.blue }]} />

      {/* Header */}
      <View style={styles.currentCardHeader}>
        <View style={[styles.currentCardIconRing, { borderColor: T.blue + '44', backgroundColor: T.blueTint }]}>
          <Text style={styles.currentCardIcon}>{meta.icon}</Text>
        </View>
        <View style={styles.currentCardHeaderText}>
          <View style={styles.currentNowBadge}>
            <View style={styles.currentNowDot} />
            <Text style={styles.currentNowLabel}>ACTIVE NOW</Text>
          </View>
          <Text style={styles.currentCardActivity}>{advisory.activity}</Text>
          <Text style={styles.currentCardStage}>{advisory.stage_name}</Text>
        </View>
      </View>

      {/* Day range + timing chips */}
      <View style={styles.currentChipRow}>
        {advisory.start_day != null && (
          <View style={[styles.currentChip, { backgroundColor: T.blue + '18', borderColor: T.blue + '44' }]}>
            <Text style={[styles.currentChipText, { color: T.blue }]}>
              Day {advisory.start_day}–{advisory.end_day}
            </Text>
          </View>
        )}
        {advisory.activity_time && (
          <View style={styles.currentTimeChip}>
            <Text style={styles.currentTimeChipText}>🕐 {advisory.activity_time}</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.currentDivider} />

      {/* Specifications */}
      {specLines.length > 0 && (
        <View style={styles.currentSection}>
          <Text style={[styles.currentSectionLabel, { color: T.blue }]}>WHAT TO DO</Text>
          {specLines.map((line, i) => (
            <View key={i} style={styles.currentSpecLine}>
              <View style={[styles.currentSpecDot, { backgroundColor: T.blue }]} />
              <Text style={styles.currentSpecText}>{line.replace(/^\d+\.\s*/, '')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Steps */}
      {stepLines.length > 0 && (
        <View style={[styles.currentSection, { backgroundColor: T.blueTint, borderRadius: 12, padding: 14, marginTop: 4 }]}>
          <Text style={[styles.currentSectionLabel, { color: T.blue }]}>HOW TO DO IT</Text>
          {stepLines.map((line, i) => (
            <View key={i} style={styles.currentStep}>
              <View style={[styles.currentStepBadge, { backgroundColor: T.blue }]}>
                <Text style={styles.currentStepNum}>{i + 1}</Text>
              </View>
              <Text style={[styles.currentStepText, { color: T.text }]}>
                {line.replace(/^\d+\.\s*/, '')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Day Progress Bar ─────────────────────────────────────────────────────────
export function DayProgressBar({ daysSinceSowing, totalDays = 120 }: { daysSinceSowing: number; totalDays?: number }) {
  const progress = Math.min(daysSinceSowing / totalDays, 1);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: progress, duration: 900, useNativeDriver: false }).start();
  }, [progress]);

  const animatedWidth = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.progressCard}>
      {/* Left: day counter */}
      <View style={styles.progressLeft}>
        <Text style={styles.progressDayNum}>{daysSinceSowing}</Text>
        <Text style={styles.progressDayLabel}>days{'\n'}since sowing</Text>
      </View>

      {/* Right: bar + stage label */}
      <View style={styles.progressRight}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: animatedWidth }]} />
          {/* Thumb */}
          <Animated.View style={[styles.progressThumb, { left: animatedWidth }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabelLeft}>Sowing</Text>
          <Text style={styles.progressLabelRight}>Harvest</Text>
        </View>
        <View style={styles.progressStageRow}>
          <View style={styles.progressStagePill}>
            <Text style={styles.progressStageText}>🌽 Tasseling Stage · Day {daysSinceSowing}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main Advisory Tab ────────────────────────────────────────────────────────
export function AdvisoryTab({
  advisoriesLoading,
  advisories,
  daysSinceSowing,
}: {
  advisoriesLoading: boolean;
  advisories: Advisory[];
  daysSinceSowing: number | null;
}) {
  const currentAdvisories = advisories.filter((a) => a.is_current_period);
  const otherAdvisories   = advisories.filter((a) => !a.is_current_period);

  if (advisoriesLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={T.primary} />
        <Text style={styles.loadingText}>Loading advisories…</Text>
      </View>
    );
  }

  if (advisories.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>No advisories yet</Text>
        <Text style={styles.emptySub}>Crop advisories will appear here once available.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Day progress */}
      {daysSinceSowing != null && (
        <DayProgressBar daysSinceSowing={daysSinceSowing} />
      )}

      {/* Current advisories */}
      {currentAdvisories.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderDot} />
            <Text style={styles.sectionHeaderText}>Active right now</Text>
          </View>
          {currentAdvisories.map((a) => (
            <CurrentAdvisoryCard key={a.id} advisory={a} />
          ))}
        </>
      )}

      {/* Other advisories */}
      {otherAdvisories.length > 0 && (
        <>
          <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
            <Text style={styles.sectionHeaderTextMuted}>All crop timeline</Text>
          </View>
          {otherAdvisories.map((a) => (
            <AccordionItem key={a.id} advisory={a} daysSinceSowing={daysSinceSowing} />
          ))}
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingWrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { color: T.textMuted, fontSize: 13 },

  empty:      { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: T.text,     fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptySub:   { color: T.textMuted, fontSize: 13, textAlign: 'center' },

  // Progress card
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  progressLeft: { alignItems: 'center', minWidth: 52 },
  progressDayNum: {
    fontSize: 36,
    fontWeight: '800',
    color: T.primary,
    lineHeight: 40,
  },
  progressDayLabel: { fontSize: 10, color: T.textMuted, textAlign: 'center', lineHeight: 14, marginTop: 2 },
  progressRight: { flex: 1 },
  progressBarTrack: {
    height: 8,
    backgroundColor: T.border,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 6,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: T.primary,
    borderRadius: 4,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.surface,
    borderWidth: 2.5,
    borderColor: T.primary,
    marginLeft: -8,
    shadowColor: T.primary,
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabelLeft:  { fontSize: 9, color: T.textMuted },
  progressLabelRight: { fontSize: 9, color: T.textMuted },
  progressStageRow: { marginTop: 6 },
  progressStagePill: {
    alignSelf: 'flex-start',
    backgroundColor: T.headerTint,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  progressStageText: { fontSize: 11, color: T.primary, fontWeight: '600' },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderText:     { fontSize: 12, fontWeight: '700', color: T.primary,   letterSpacing: 0.4 },
  sectionHeaderTextMuted:{ fontSize: 12, fontWeight: '700', color: T.textMuted, letterSpacing: 0.4 },

  // ── Current advisory card ─────────────────────────────────────────────────
  currentCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: T.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  currentCardStripe: { height: 4, width: '100%' },

  currentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    paddingBottom: 10,
  },
  currentCardIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentCardIcon: { fontSize: 24 },

  currentCardHeaderText: { flex: 1 },
  currentNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  currentNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.secondary,
    shadowColor: T.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 2,
  },
  currentNowLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: T.primary,
  },
  currentCardActivity: {
    fontSize: 16,
    fontWeight: '800',
    color: T.text,
    lineHeight: 22,
  },
  currentCardStage: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },

  currentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  currentChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  currentChipText: { fontSize: 11, fontWeight: '700' },
  currentTimeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: T.headerTint,
    borderWidth: 1,
    borderColor: T.border,
  },
  currentTimeChipText: { fontSize: 11, color: T.textMuted, fontWeight: '600' },

  currentDivider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 16,
    marginBottom: 14,
  },

  currentSection: { paddingHorizontal: 16, paddingBottom: 14 },
  currentSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: T.textMuted,
    marginBottom: 10,
  },
  currentSpecLine: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  currentSpecDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  currentSpecText: {
    flex: 1,
    fontSize: 13,
    color: T.text,
    lineHeight: 20,
  },

  currentStep: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  currentStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  currentStepNum: { fontSize: 11, fontWeight: '800', color: '#fff' },
  currentStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: T.text,
  },

  // ── Accordion ─────────────────────────────────────────────────────────────
  accordionWrap: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accordionWrapPast: {
    backgroundColor: T.bg,
    borderColor: T.border,
    opacity: 0.75,
  },

  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingRight: 14,
  },
  accordionAccentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 0,
  },
  accordionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionIcon: { fontSize: 18 },

  accordionTitleBlock: { flex: 1, minWidth: 0 },
  accordionDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: T.primary,
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  accordionDayLabelPast: { color: T.textMuted },
  accordionActivityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
  },
  accordionActivityLabelPast: { color: T.textMuted },

  accordionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  accordionChevron: {
    fontSize: 20,
    color: T.textMuted,
    fontWeight: '300',
  },

  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  accordionMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, marginTop: 10 },
  accordionStagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  accordionStagePillText: { fontSize: 11, fontWeight: '600' },
  accordionTimePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: T.headerTint,
    borderWidth: 1,
    borderColor: T.border,
  },
  accordionTimePillText: { fontSize: 11, color: T.textMuted },

  accordionSection: { marginBottom: 12 },
  accordionSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: T.textMuted,
    marginBottom: 8,
  },
  accordionStepsSection: {
    backgroundColor: T.headerTint,
    borderRadius: 10,
    padding: 12,
  },

  accordionLine: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  accordionLineDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  accordionLineText: { flex: 1, fontSize: 12, color: T.text, lineHeight: 19 },

  accordionStep: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  accordionStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  accordionStepNumText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  accordionStepText:    { flex: 1, fontSize: 12, color: T.text, lineHeight: 19 },
});
