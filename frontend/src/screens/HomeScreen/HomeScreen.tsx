import { StyleSheet, Text, View } from 'react-native';

export function HomeScreen() {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.description}>React Native 앱이 준비되었습니다.</Text>
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
  description: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
});
