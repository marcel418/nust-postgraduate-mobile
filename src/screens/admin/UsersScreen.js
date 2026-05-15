import { View, Text, StyleSheet } from 'react-native';
export default function UsersScreen() {
  return <View style={styles.container}><Text>Users</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
});