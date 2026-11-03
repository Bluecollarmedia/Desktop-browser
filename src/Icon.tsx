import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type Props = {
  name: string;
  size?: number;
  color: ColorValue;
  weight?: SymbolWeight;
};

/** Apple SF Symbols, the same icons Safari and system apps use. */
export function Icon({ name, size = 20, color, weight = 'regular' }: Props) {
  return (
    <SymbolView
      name={name as never}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size + 4, height: size + 4 }}
    />
  );
}
