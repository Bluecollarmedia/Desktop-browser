import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from './Icon';
import { accent, useColors } from './theme';
import { displayHost, isSecure } from './url';

type Props = {
  url: string;
  loading: boolean;
  progress: number;
  canGoBack: boolean;
  canGoForward: boolean;
  tabCount: number;
  bottomInset: number;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSubmit: (text: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onTabs: () => void;
  onSettings: () => void;
};

/** One slim bar at the bottom, so the website gets the rest of the screen. */
export function Toolbar(props: Props) {
  const colors = useColors();
  const [text, setText] = useState('');

  const startEditing = () => {
    setText(props.url);
    props.onEditingChange(true);
  };

  const host = displayHost(props.url);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bar,
          borderTopColor: colors.barBorder,
          paddingBottom: Math.max(props.bottomInset, 8),
        },
      ]}
    >
      {props.loading && !props.editing ? (
        <View
          style={[styles.progress, { width: `${Math.max(0.08, props.progress) * 100}%` }]}
        />
      ) : null}

      {props.editing ? (
        <View style={styles.row}>
          <View style={[styles.field, styles.fieldEditing, { backgroundColor: colors.field }]}>
            <Icon name="magnifyingglass" size={15} color={colors.secondary} />
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => props.onSubmit(text)}
              onBlur={() => props.onEditingChange(false)}
              placeholder="Search or enter website"
              placeholderTextColor={colors.secondary}
              style={[styles.input, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              keyboardType="web-search"
              returnKeyType="go"
              selectTextOnFocus
              clearButtonMode="while-editing"
              enablesReturnKeyAutomatically
              textContentType="URL"
            />
          </View>
          <Pressable
            onPress={() => props.onEditingChange(false)}
            hitSlop={8}
            style={styles.cancel}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelText, { color: accent }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <BarButton
            icon="chevron.backward"
            label="Back"
            disabled={!props.canGoBack}
            onPress={props.onBack}
          />
          <BarButton
            icon="chevron.forward"
            label="Forward"
            disabled={!props.canGoForward}
            onPress={props.onForward}
          />

          <Pressable
            onPress={startEditing}
            style={[styles.field, { backgroundColor: colors.field }]}
            accessibilityRole="button"
            accessibilityLabel={`Address: ${host || 'Search or enter website'}`}
          >
            <View style={styles.fieldInner}>
              {host && isSecure(props.url) ? (
                <Icon name="lock.fill" size={11} color={colors.secondary} />
              ) : null}
              <Text
                numberOfLines={1}
                style={[styles.host, { color: host ? colors.text : colors.secondary }]}
              >
                {host || 'Search or enter website'}
              </Text>
            </View>
            <Pressable
              onPress={props.loading ? props.onStop : props.onReload}
              hitSlop={10}
              style={styles.reload}
              accessibilityRole="button"
              accessibilityLabel={props.loading ? 'Stop loading' : 'Reload'}
            >
              <Icon
                name={props.loading ? 'xmark' : 'arrow.clockwise'}
                size={15}
                weight="medium"
                color={colors.icon}
              />
            </Pressable>
          </Pressable>

          <Pressable
            onPress={props.onTabs}
            hitSlop={6}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={`${props.tabCount} tabs`}
          >
            <View style={[styles.tabCount, { borderColor: colors.icon }]}>
              <Text style={[styles.tabCountText, { color: colors.icon }]}>
                {props.tabCount > 99 ? '∞' : props.tabCount}
              </Text>
            </View>
          </Pressable>
          <BarButton icon="gearshape" label="Settings" onPress={props.onSettings} />
        </View>
      )}
    </View>
  );
}

function BarButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Icon
        name={icon}
        size={20}
        weight="medium"
        color={disabled ? colors.disabled : colors.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 7,
    paddingHorizontal: 8,
  },
  progress: {
    position: 'absolute',
    top: -1,
    left: 0,
    height: 2,
    backgroundColor: accent,
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  button: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    marginHorizontal: 4,
  },
  fieldEditing: {
    marginLeft: 4,
    gap: 6,
  },
  fieldInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingLeft: 22,
  },
  host: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  reload: {
    width: 36,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 16,
    paddingRight: 6,
  },
  cancel: {
    paddingHorizontal: 10,
    height: 38,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 17,
  },
  tabCount: {
    width: 21,
    height: 21,
    borderRadius: 5,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
