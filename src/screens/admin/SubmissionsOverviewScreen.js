import { View, Text, StyleSheet } from 'react-native';
export default function SubmissionsOverviewScreen() {
  return <View style={styles.container}><Text>Submissions Overview</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
});