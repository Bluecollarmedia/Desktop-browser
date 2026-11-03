import { useColorScheme } from 'react-native';

export const accent = '#FF7A1A';

const light = {
  background: '#FFFFFF',
  bar: '#F7F7F8',
  barBorder: 'rgba(0,0,0,0.12)',
  field: 'rgba(118,118,128,0.12)',
  text: '#000000',
  secondary: 'rgba(60,60,67,0.6)',
  icon: '#1C1C1E',
  disabled: 'rgba(60,60,67,0.28)',
  groupBackground: '#F2F2F7',
  cell: '#FFFFFF',
  separator: 'rgba(60,60,67,0.18)',
  destructive: '#FF3B30',
};

const dark: typeof light = {
  background: '#000000',
  bar: '#121214',
  barBorder: 'rgba(255,255,255,0.12)',
  field: 'rgba(118,118,128,0.24)',
  text: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.6)',
  icon: '#F2F2F7',
  disabled: 'rgba(235,235,245,0.25)',
  groupBackground: '#000000',
  cell: '#1C1C1E',
  separator: 'rgba(84,84,88,0.6)',
  destructive: '#FF453A',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
