import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Icon } from './Icon';
import { accent, useColors } from './theme';
import { displayHost } from './url';

export type TabSummary = { id: string; title: string; url: string };

type Props = {
  visible: boolean;
  tabs: TabSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onClose: () => void;
};

export function TabsSheet(props: Props) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const columns = width > 600 ? 3 : 2;
  const gap = 12;
  const cardWidth = (width - 32 - gap * (columns - 1)) / columns;

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
          <Pressable onPress={props.onNewTab} hitSlop={10} style={styles.newTab}>
            <Icon name="plus" size={20} weight="medium" color={accent} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {props.tabs.length === 1 ? '1 Tab' : `${props.tabs.length} Tabs`}
          </Text>
          <Pressable onPress={props.onClose} hitSlop={10} style={styles.done}>
            <Text style={[styles.doneText, { color: accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.grid, { gap }]}>
          {props.tabs.map((tab) => {
            const active = tab.id === props.activeId;
            const host = displayHost(tab.url);
            return (
              <Pressable
                key={tab.id}
                onPress={() => props.onSelect(tab.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    width: cardWidth,
                    backgroundColor: colors.cell,
                    borderColor: active ? accent : colors.separator,
                    borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={tab.title || host}
                accessibilityState={{ selected: active }}
              >
                <View style={styles.cardTop}>
                  <Icon name="globe" size={14} color={colors.secondary} />
                  <Text numberOfLines={1} style={[styles.host, { color: colors.secondary }]}>
                    {host || 'New Tab'}
                  </Text>
                  <Pressable
                    onPress={() => props.onCloseTab(tab.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Close tab"
                  >
                    <Icon name="xmark.circle.fill" size={18} color={colors.disabled} />
                  </Pressable>
                </View>
                <Text numberOfLines={3} style={[styles.cardTitle, { color: colors.text }]}>
                  {tab.title || host || 'New Tab'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
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
  newTab: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  done: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  doneText: { fontSize: 17, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    height: 128,
    borderRadius: 16,
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  host: { flex: 1, fontSize: 12, fontWeight: '500' },
  cardTitle: { marginTop: 10, fontSize: 15, fontWeight: '600', lineHeight: 20 },
});
