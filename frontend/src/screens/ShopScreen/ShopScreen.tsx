import { StyleSheet, Text, View } from 'react-native';

export function ShopScreen() {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>상점</Text>
    </View>
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
