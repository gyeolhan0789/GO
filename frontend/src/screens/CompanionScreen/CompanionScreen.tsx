import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../shared/components/Screen/Screen';

export function CompanionScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>동행</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
});
