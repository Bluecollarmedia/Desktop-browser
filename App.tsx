import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DesktopWeb,
  DesktopWebView,
  type DesktopWebViewRef,
  type PageState,
} from './modules/desktop-web';
import { SettingsSheet } from './src/SettingsSheet';
import { TabsSheet } from './src/TabsSheet';
import { Toolbar } from './src/Toolbar';
import { accent, useColors } from './src/theme';
import { addressToUrl, searchEngines, type SearchEngineId } from './src/url';

type Tab = PageState & {
  id: string;
  initialUrl: string;
  zoom: number;
  error: { message: string; url: string } | null;
};

let nextTabId = 1;

function makeTab(url: string): Tab {
  return {
    id: String(nextTabId++),
    initialUrl: url,
    url,
    title: '',
    canGoBack: false,
    canGoForward: false,
    loading: true,
    progress: 0,
    zoom: 100,
    error: null,
  };
}

function savedEngine(): SearchEngineId {
  const value = DesktopWeb.getSetting('searchEngine');
  return value === 'bing' || value === 'duckduckgo' ? value : 'google';
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Browser />
    </SafeAreaProvider>
  );
}

function Browser() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [engine, setEngine] = useState<SearchEngineId>(savedEngine);
  const [tabs, setTabs] = useState<Tab[]>(() => [
    makeTab(DesktopWeb.testUrl() || searchEngines[savedEngine()].home),
  ]);
  const [activeId, setActiveId] = useState(() => tabs[0].id);
  const [editing, setEditing] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const refs = useRef(new Map<string, DesktopWebViewRef>());

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const activeRef = () => refs.current.get(active.id);

  const updateTab = useCallback((id: string, patch: Partial<Tab>) => {
    setTabs((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const openTab = useCallback((url: string) => {
    const tab = makeTab(url);
    setTabs((list) => [...list, tab]);
    setActiveId(tab.id);
  }, []);

  const closeTab = (id: string) => {
    refs.current.delete(id);
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const tab = makeTab(searchEngines[engine].home);
      setTabs([tab]);
      setActiveId(tab.id);
      return;
    }
    setTabs(remaining);
    if (id === activeId) {
      const index = tabs.findIndex((t) => t.id === id);
      setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
    }
  };

  const submitAddress = (text: string) => {
    const url = addressToUrl(text, engine);
    setEditing(false);
    if (!url) return;
    updateTab(active.id, { error: null });
    activeRef()?.load(url);
  };

  const chooseEngine = (id: SearchEngineId) => {
    setEngine(id);
    DesktopWeb.setSetting('searchEngine', id);
  };

  const setZoom = (promise: Promise<number> | undefined) => {
    const id = active.id;
    promise?.then((zoom) => updateTab(id, { zoom }));
  };

  const tabSummaries = useMemo(
    () => tabs.map((t) => ({ id: t.id, title: t.title, url: t.url })),
    [tabs],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bar }]}>
      <StatusBar style="auto" />
      <View style={{ height: insets.top, backgroundColor: colors.bar }} />

      <KeyboardAvoidingView style={styles.root} behavior="padding" enabled={editing}>
        <View
          style={[
            styles.pages,
            { backgroundColor: colors.background, marginLeft: insets.left, marginRight: insets.right },
          ]}
        >
          {tabs.map((tab) => (
            <TabPage
              key={tab.id}
              tab={tab}
              active={tab.id === active.id}
              registerRef={(ref) => {
                if (ref) refs.current.set(tab.id, ref);
              }}
              onUpdate={updateTab}
              onOpenWindow={openTab}
              onRetry={() => refs.current.get(tab.id)?.reload()}
            />
          ))}
          {editing ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setEditing(false)}
              accessibilityLabel="Cancel editing"
            />
          ) : null}
        </View>

        <View style={{ paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: colors.bar }}>
          <Toolbar
            url={active.url}
            loading={active.loading}
            progress={active.progress}
            canGoBack={active.canGoBack}
            canGoForward={active.canGoForward}
            tabCount={tabs.length}
            bottomInset={editing ? 0 : insets.bottom}
            editing={editing}
            onEditingChange={setEditing}
            onSubmit={submitAddress}
            onBack={() => activeRef()?.goBack()}
            onForward={() => activeRef()?.goForward()}
            onReload={() => {
              updateTab(active.id, { error: null });
              activeRef()?.reload();
            }}
            onStop={() => activeRef()?.stopLoading()}
            onTabs={() => setShowTabs(true)}
            onSettings={() => {
              setZoom(activeRef()?.getZoom());
              setShowSettings(true);
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <TabsSheet
        visible={showTabs}
        tabs={tabSummaries}
        activeId={active.id}
        onSelect={(id) => {
          setActiveId(id);
          setShowTabs(false);
        }}
        onCloseTab={closeTab}
        onNewTab={() => {
          openTab(searchEngines[engine].home);
          setShowTabs(false);
        }}
        onClose={() => setShowTabs(false)}
      />

      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        zoomPercent={active.zoom}
        onZoomIn={() => setZoom(activeRef()?.zoomIn())}
        onZoomOut={() => setZoom(activeRef()?.zoomOut())}
        onResetZoom={() => setZoom(activeRef()?.resetZoom())}
        searchEngine={engine}
        onSearchEngine={chooseEngine}
        onClearData={() => {
          DesktopWeb.clearWebsiteData();
        }}
      />
    </View>
  );
}

/**
 * Every tab keeps its own live web view. Switching tabs only changes which one is
 * visible, so pages never reload when you switch.
 */
const TabPage = memo(function TabPage({
  tab,
  active,
  registerRef,
  onUpdate,
  onOpenWindow,
  onRetry,
}: {
  tab: Tab;
  active: boolean;
  registerRef: (ref: DesktopWebViewRef | null) => void;
  onUpdate: (id: string, patch: Partial<Tab>) => void;
  onOpenWindow: (url: string) => void;
  onRetry: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity: active ? 1 : 0, zIndex: active ? 1 : 0 }]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <DesktopWebView
        ref={registerRef}
        style={StyleSheet.absoluteFill}
        initialUrl={tab.initialUrl}
        onStateChange={({ nativeEvent }) => {
          const patch: Partial<Tab> = { ...nativeEvent };
          if (nativeEvent.loading) patch.error = null;
          onUpdate(tab.id, patch);
        }}
        onZoomChange={({ nativeEvent }) => onUpdate(tab.id, { zoom: nativeEvent.percent })}
        onOpenWindow={({ nativeEvent }) => onOpenWindow(nativeEvent.url)}
        onLoadError={({ nativeEvent }) => onUpdate(tab.id, { error: nativeEvent })}
      />
      {tab.error ? (
        <View style={[StyleSheet.absoluteFill, styles.error, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Can't open this page</Text>
          <Text style={[styles.errorText, { color: colors.secondary }]}>{tab.error.message}</Text>
          <Pressable
            onPress={() => {
              onUpdate(tab.id, { error: null });
              onRetry();
            }}
            style={({ pressed }) => [styles.errorButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  pages: { flex: 1, overflow: 'hidden' },
  error: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  errorTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  errorText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  errorButton: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: accent,
  },
  errorButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
