import { StyleSheet, Text, View } from 'react-native';

export default function ReviewsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Reviews</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', 
    justifyContent: 'center', backgroundColor: '#F4F6F9' },
  text: { fontSize: 20, fontWeight: 'bold' },
});