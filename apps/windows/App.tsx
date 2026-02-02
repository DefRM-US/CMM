import { StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
  },
});

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Windows App</Text>
    </View>
  );
}
