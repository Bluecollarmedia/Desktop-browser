import { requireNativeModule, requireNativeView } from 'expo';
import type { ComponentType, Ref } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

export type PageState = {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  progress: number;
};

export type DesktopWebViewRef = {
  load(url: string): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  stopLoading(): Promise<void>;
  /** Each returns the new zoom, where 100 means the full desktop width fits the screen. */
  zoomIn(): Promise<number>;
  zoomOut(): Promise<number>;
  resetZoom(): Promise<number>;
  getZoom(): Promise<number>;
};

export type DesktopWebViewProps = ViewProps & {
  ref?: Ref<DesktopWebViewRef>;
  initialUrl: string;
  onStateChange?: (event: NativeSyntheticEvent<PageState>) => void;
  onZoomChange?: (event: NativeSyntheticEvent<{ percent: number }>) => void;
  onOpenWindow?: (event: NativeSyntheticEvent<{ url: string }>) => void;
  onLoadError?: (event: NativeSyntheticEvent<{ message: string; url: string }>) => void;
};

type DesktopWebModuleType = {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  testUrl(): string;
  clearWebsiteData(): Promise<void>;
};

export const DesktopWeb = requireNativeModule<DesktopWebModuleType>('DesktopWeb');

export const DesktopWebView: ComponentType<DesktopWebViewProps> = requireNativeView('DesktopWeb');
