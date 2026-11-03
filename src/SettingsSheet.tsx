import type { ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon } from './Icon';
import { accent, useColors } from './theme';
import { searchEngineOrder, searchEngines, type SearchEngineId } from './url';

type Props = {
  visible: boolean;
  onClose: () => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  searchEngine: SearchEngineId;
  onSearchEngine: (id: SearchEngineId) => void;
  onClearData: () => void;
};

export function SettingsSheet(props: Props) {
  const colors = useColors();

  const confirmClear = () => {
    Alert.alert(
      'Clear Cookies and Website Data?',
      'You will be signed out of websites. Open tabs stay open.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: props.onClearData },
      ],
    );
  };

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[styles.sheet, { backgroundColor: colors.groupBackground }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Pressable onPress={props.onClose} hitSlop={10} style={styles.done}>
            <Text style={[styles.doneText, { color: accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Section
            title="Page Zoom"
            footer="100% fits the whole desktop page across your screen. Pinch to zoom any time. Every new website opens at 100%."
          >
            <View style={styles.cellRow}>
              <Text style={[styles.cellLabel, { color: colors.text }]}>Zoom</Text>
              <View style={styles.stepper}>
                <StepButton icon="minus" label="Zoom out" onPress={props.onZoomOut} />
                <Text style={[styles.percent, { color: colors.text }]}>
                  {Math.round(props.zoomPercent)}%
                </Text>
                <StepButton icon="plus" label="Zoom in" onPress={props.onZoomIn} />
              </View>
            </View>
            <Separator />
            <Pressable
              onPress={props.onResetZoom}
              style={({ pressed }) => [styles.cellRow, pressed && { opacity: 0.5 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.cellLabel, { color: accent }]}>Reset Zoom to 100%</Text>
            </Pressable>
          </Section>

          <Section
            title="Desktop Websites"
            footer="Always on. Every website is asked for its real desktop version, the same way Safari's Request Desktop Website works. If a site has no desktop version, you see what it sends."
          >
            <View style={styles.cellRow}>
              <Text style={[styles.cellLabel, { color: colors.text }]}>Request Desktop Website</Text>
              <Switch value disabled trackColor={{ true: accent, false: accent }} />
            </View>
          </Section>

          <Section title="Search Engine">
            {searchEngineOrder.map((id, index) => (
              <View key={id}>
                {index > 0 ? <Separator /> : null}
                <Pressable
                  onPress={() => props.onSearchEngine(id)}
                  style={({ pressed }) => [styles.cellRow, pressed && { opacity: 0.5 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: props.searchEngine === id }}
                >
                  <Text style={[styles.cellLabel, { color: colors.text }]}>
                    {searchEngines[id].name}
                  </Text>
                  {props.searchEngine === id ? (
                    <Icon name="checkmark" size={16} weight="semibold" color={accent} />
                  ) : null}
                </Pressable>
              </View>
            ))}
          </Section>

          <Section>
            <Pressable
              onPress={confirmClear}
              style={({ pressed }) => [styles.cellRow, pressed && { opacity: 0.5 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.cellLabel, { color: colors.destructive }]}>
                Clear Cookies and Website Data
              </Text>
            </Pressable>
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{title.toUpperCase()}</Text>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.cell }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: colors.secondary }]}>{footer}</Text> : null}
    </View>
  );
}

function Separator() {
  const colors = useColors();
  return <View style={[styles.separator, { backgroundColor: colors.separator }]} />;
}

function StepButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.step,
        { backgroundColor: colors.field },
        pressed && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={15} weight="semibold" color={colors.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '600' },
  done: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  doneText: { fontSize: 17, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 13, marginLeft: 16, marginBottom: 7 },
  group: { borderRadius: 12, overflow: 'hidden' },
  footer: { fontSize: 13, lineHeight: 18, marginHorizontal: 16, marginTop: 7 },
  cellRow: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cellLabel: { fontSize: 17, flexShrink: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 40,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
