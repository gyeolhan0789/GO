import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SafeAreaViewProps } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  edges?: SafeAreaViewProps['edges'];
}>;

// Bottom edge is excluded by default: tab screens render inside the bottom tab
// navigator, which already reserves its own bottom inset. Root stack screens
// have a native header instead, so they pass edges={['bottom']}.
const DEFAULT_EDGES: SafeAreaViewProps['edges'] = ['top'];

export function Screen({ children, edges = DEFAULT_EDGES }: ScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
