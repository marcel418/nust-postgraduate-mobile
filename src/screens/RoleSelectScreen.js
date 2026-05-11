// src/screens/RoleSelectScreen.js
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';

const roles = [
  { label: 'Student', icon: 'school-outline', screen: 'StudentStack', color: '#1E56A0' },
  { label: 'Supervisor', icon: 'person-outline', screen: 'SupervisorStack', color: '#163172' },
  { label: 'Head of Department', icon: 'business-outline', screen: 'HODStack', color: '#0D3B66' },
  { label: 'Internal Evaluator', icon: 'clipboard-outline', screen: 'EvaluatorStack', color: '#1B4332' },
  { label: 'External Evaluator', icon: 'document-text-outline', screen: 'ExternalEvaluatorStack', color: '#2C3E50' },
  { label: 'FPGC-R', icon: 'people-outline', screen: 'FPGCRStack', color: '#4A1942' },
  { label: 'FPGC', icon: 'shield-checkmark-outline', screen: 'FPGCStack', color: '#7C2D12' },
];

export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>PGMS</Text>
        <Text style={styles.subtitle}>Select your role to continue</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.screen}
            style={[styles.button, { backgroundColor: role.color }]}
            onPress={() => navigation.navigate(role.screen)}
          >
            <Ionicons name={role.icon} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>{role.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1931' },
  top: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#9BA4B5', marginTop: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16,
  },
  buttonText: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});